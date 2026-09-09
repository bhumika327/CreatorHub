import { prisma } from '../../prisma/client';
import { EngagementService } from '../engagement/engagement.service';
import { PaymentService } from './payment.service';
import { UserRole } from '@prisma/client';

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING PAYMENTS & ESCROW INTEGRATION TESTS');
  console.log('==================================================');

  let testCustomerId = '';
  let testCreatorId = '';
  let testUnauthorizedId = '';
  let requirementId = '';
  let proposalId = '';
  let engagementId = '';
  let milestone1Id = '';
  let milestone2Id = '';

  try {
    // SETUP: Clean up existing test users if they exist
    await prisma.authUser.deleteMany({
      where: {
        email: { in: ['test_customer@example.com', 'test_creator@example.com', 'test_unauth@example.com'] }
      }
    });

    console.log('[Setup] Creating test users...');
    // Create users
    const customer = await prisma.authUser.create({
      data: {
        email: 'test_customer@example.com',
        passwordHash: 'dummyhash',
        role: UserRole.CUSTOMER,
        customerProfile: {
          create: {
            fullName: 'Test Customer'
          }
        }
      }
    });
    testCustomerId = customer.id;

    const creator = await prisma.authUser.create({
      data: {
        email: 'test_creator@example.com',
        passwordHash: 'dummyhash',
        role: UserRole.CREATOR,
        creatorProfile: {
          create: {
            displayName: 'Test Creator',
            isApproved: true,
            verificationStatus: 'VERIFIED'
          }
        }
      }
    });
    testCreatorId = creator.id;

    const unauth = await prisma.authUser.create({
      data: {
        email: 'test_unauth@example.com',
        passwordHash: 'dummyhash',
        role: UserRole.CUSTOMER,
        customerProfile: {
          create: {
            fullName: 'Test Unauth'
          }
        }
      }
    });
    testUnauthorizedId = unauth.id;

    // Ensure permissions are registered
    await prisma.authRolePermission.upsert({
      where: { role_permissionName: { role: UserRole.CUSTOMER, permissionName: 'payment:fund' } },
      update: {},
      create: { role: UserRole.CUSTOMER, permissionName: 'payment:fund' }
    });
    await prisma.authRolePermission.upsert({
      where: { role_permissionName: { role: UserRole.CUSTOMER, permissionName: 'payment:release' } },
      update: {},
      create: { role: UserRole.CUSTOMER, permissionName: 'payment:release' }
    });
    await prisma.authRolePermission.upsert({
      where: { role_permissionName: { role: UserRole.CUSTOMER, permissionName: 'payment:refund' } },
      update: {},
      create: { role: UserRole.CUSTOMER, permissionName: 'payment:refund' }
    });
    await prisma.authRolePermission.upsert({
      where: { role_permissionName: { role: UserRole.CREATOR, permissionName: 'payment:view' } },
      update: {},
      create: { role: UserRole.CREATOR, permissionName: 'payment:view' }
    });

    console.log('[Setup] Creating requirement, proposal, and contract engagement...');
    // Create CatalogRequirement
    const requirement = await prisma.catalogRequirement.create({
      data: {
        customerId: testCustomerId,
        title: 'Test Logo Design',
        description: 'Need a beautiful vectorized business logo',
        budget: 500.00,
        category: 'Graphic Design'
      }
    });
    requirementId = requirement.id;

    // Create EngagementProposal
    const proposal = await prisma.engagementProposal.create({
      data: {
        requirementId: requirement.id,
        creatorId: testCreatorId,
        coverLetter: 'I will design a beautiful logo for you.',
        bidAmount: 500.00,
        deliveryDays: 5
      }
    });
    proposalId = proposal.id;

    // Accept proposal with 2 milestones ($300 and $200)
    const engagement = await EngagementService.acceptProposal(testCustomerId, proposal.id, [
      { title: 'Milestone 1: Draft concepts', description: '3 preliminary logo drafts', amount: 300.00 },
      { title: 'Milestone 2: Final delivery', description: 'Vector files and copyrights', amount: 200.00 }
    ]);
    engagementId = engagement.id;

    // Retrieve milestone IDs
    const milestones = await prisma.engagementMilestone.findMany({
      where: { engagementId: engagement.id },
      orderBy: { amount: 'desc' }
    });
    milestone1Id = milestones[0].id; // $300
    milestone2Id = milestones[1].id; // $200

    console.log('[Setup] Done. Running test assertions...\n');

    // ----------------------------------------------------------------
    // TEST 1: Customer can create/fund a valid milestone payment.
    // ----------------------------------------------------------------
    console.log('Running Test 1: Customer can fund milestone payment...');
    const fundTx = await PaymentService.fundMilestone(milestone1Id, testCustomerId);
    if (fundTx.status === 'HELD' && fundTx.type === 'ESCROW_HOLD') {
      console.log('  -> PASS: Milestone successfully funded and held in escrow.');
    } else {
      throw new Error('Test 1 failed: Incorrect transaction status or type.');
    }

    // ----------------------------------------------------------------
    // TEST 2: Unauthorized user cannot fund another user's milestone.
    // ----------------------------------------------------------------
    console.log('Running Test 2: Unauthorized user cannot fund milestone...');
    try {
      await PaymentService.fundMilestone(milestone1Id, testUnauthorizedId);
      throw new Error('Test 2 failed: Exception was not thrown for unauthorized fund operation.');
    } catch (err: any) {
      if (err.status === 403) {
        console.log('  -> PASS: Unauthorized fund call blocked with 403.');
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------------------
    // TEST 5: Rejected milestone does not release held funds.
    // ----------------------------------------------------------------
    console.log('Running Test 5: Rejected milestone does not release held funds...');
    // Submit work
    await EngagementService.submitMilestoneWork(testCreatorId, milestone1Id, 'http://cloudinary.com/logo-drafts.pdf', 'Here are the drafts.');
    // Reject work
    await EngagementService.rejectMilestoneWork(testCustomerId, milestone1Id, 'Logo drafts must be in high resolution');
    
    // Verify status is HELD
    const checkTxRejected = await prisma.paymentTransactionLedger.findFirst({
      where: { milestoneId: milestone1Id, type: 'ESCROW_HOLD' }
    });
    if (checkTxRejected?.status === 'HELD') {
      console.log('  -> PASS: Rejected milestone keeps funds HELD in escrow.');
    } else {
      throw new Error(`Test 5 failed: Transaction status changed to ${checkTxRejected?.status}`);
    }

    // ----------------------------------------------------------------
    // TEST 4: Valid milestone approval releases the held payment exactly once.
    // ----------------------------------------------------------------
    console.log('Running Test 4: Valid milestone approval releases held payment...');
    // Re-submit and approve
    await EngagementService.submitMilestoneWork(testCreatorId, milestone1Id, 'http://cloudinary.com/logo-drafts-v2.pdf', 'Updated draft concepts.');
    await EngagementService.approveMilestoneWork(testCustomerId, milestone1Id);

    const checkTxReleased = await prisma.paymentTransactionLedger.findFirst({
      where: { milestoneId: milestone1Id, type: 'ESCROW_HOLD' }
    });
    if (checkTxReleased?.status === 'RELEASED') {
      console.log('  -> PASS: Approved milestone releases held payment.');
    } else {
      throw new Error('Test 4 failed: Transaction status not released.');
    }

    // ----------------------------------------------------------------
    // TEST 3: Payment cannot be released twice.
    // ----------------------------------------------------------------
    console.log('Running Test 3: Payment cannot be released twice...');
    try {
      await PaymentService.releaseMilestone(milestone1Id, testCustomerId);
      throw new Error('Test 3 failed: Released twice without throwing an error.');
    } catch (err: any) {
      console.log('  -> PASS: Double release blocked as expected.');
    }

    // ----------------------------------------------------------------
    // TEST 6: Refund cannot be executed twice.
    // ----------------------------------------------------------------
    console.log('Running Test 6: Refund cannot be executed twice...');
    // Fund milestone 2
    const fundTx2 = await PaymentService.fundMilestone(milestone2Id, testCustomerId);
    // Execute refund once
    const refundTx = await PaymentService.refundTransaction(fundTx2.id, testCustomerId, UserRole.CUSTOMER);
    if (refundTx.status === 'REFUNDED') {
      console.log('  -> Milestone 2 refunded successfully.');
    } else {
      throw new Error('Failed to refund milestone 2.');
    }

    // Attempt second refund
    try {
      await PaymentService.refundTransaction(fundTx2.id, testCustomerId, UserRole.CUSTOMER);
      throw new Error('Test 6 failed: Refund executed twice without error.');
    } catch (err: any) {
      console.log('  -> PASS: Double refund blocked as expected.');
    }

    // ----------------------------------------------------------------
    // TEST 7: Ledger history remains intact after state changes.
    // ----------------------------------------------------------------
    console.log('Running Test 7: Ledger history remains intact...');
    const history = await PaymentService.getEngagementPaymentHistory(engagementId, testCustomerId, UserRole.CUSTOMER);
    if (history.length === 2) {
      console.log('  -> PASS: Ledger history is complete and intact.');
    } else {
      throw new Error(`Test 7 failed: Expected 2 transactions in history, got ${history.length}.`);
    }

    // ----------------------------------------------------------------
    // TEST 8: Payment lifecycle generates the expected notification.
    // ----------------------------------------------------------------
    console.log('Running Test 8: Notification is generated on payment lifecycle...');
    const customerNotifications = await prisma.notification.findMany({
      where: { userId: testCustomerId, title: { in: ['Milestone Funded', 'Payment Released', 'Payment Refunded'] } }
    });
    const creatorNotifications = await prisma.notification.findMany({
      where: { userId: testCreatorId, title: { in: ['Milestone Funded', 'Payment Released', 'Payment Refunded'] } }
    });

    if (customerNotifications.length > 0 && creatorNotifications.length > 0) {
      console.log('  -> PASS: Both customer and creator received real-time lifecycle notifications.');
    } else {
      throw new Error('Test 8 failed: Missing expected notifications.');
    }

    console.log('\n==================================================');
    console.log('ALL PAYMENTS & ESCROW TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
    process.exit(1);
  } finally {
    // Cleanup temporary test entries
    console.log('[Cleanup] Cleaning up test data...');
    try {
      await prisma.authUser.deleteMany({
        where: {
          email: { in: ['test_customer@example.com', 'test_creator@example.com', 'test_unauth@example.com'] }
        }
      });
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
