import { prisma } from '../../prisma/client';
import { DisputeStatus, EngagementStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

export class AdminService {
  public static async raiseDispute(initiatorId: string, engagementId: string, reason: string) {
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId }
    });

    if (!engagement) {
      throw { status: 404, message: 'Engagement not found' };
    }

    if (engagement.customerId !== initiatorId && engagement.creatorId !== initiatorId) {
      throw { status: 403, message: 'Unauthorized: only contract members can open a dispute' };
    }

    if (engagement.status === EngagementStatus.COMPLETED || engagement.status === EngagementStatus.REFUNDED) {
      throw { status: 400, message: 'Cannot dispute a completed or refunded contract' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update contract status to DISPUTED
      await tx.engagement.update({
        where: { id: engagementId },
        data: { status: EngagementStatus.DISPUTED }
      });

      // 2. Log Dispute record
      return tx.engagementDispute.create({
        data: {
          engagementId,
          initiatorId,
          reason,
          status: DisputeStatus.OPEN
        }
      });
    });

    // Notify counterparties of dispute initiation
    NotificationService.createNotification(
      engagement.creatorId,
      'Contract Status Changed',
      `A dispute has been opened on your contract "${engagementId}". Status is now Disputed.`
    ).catch(err => console.error(err));

    NotificationService.createNotification(
      engagement.customerId,
      'Contract Status Changed',
      `A dispute has been opened on your contract "${engagementId}". Status is now Disputed.`
    ).catch(err => console.error(err));

    return result;
  }

  public static async resolveDispute(disputeId: string, resolutionNotes: string, action: 'REFUND' | 'RELEASE') {
    const dispute = await prisma.engagementDispute.findUnique({
      where: { id: disputeId },
      include: { engagement: true }
    });

    if (!dispute) {
      throw { status: 404, message: 'Dispute record not found' };
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw { status: 400, message: 'Dispute is already resolved' };
    }

    const resolvedDispute = await prisma.$transaction(async (tx) => {
      const disputeStatus = action === 'REFUND' ? DisputeStatus.RESOLVED_REFUNDED : DisputeStatus.RESOLVED_RELEASED;
      const engagementStatus = action === 'REFUND' ? EngagementStatus.REFUNDED : EngagementStatus.COMPLETED;

      // 1. Update dispute state
      const resolved = await tx.engagementDispute.update({
        where: { id: disputeId },
        data: {
          status: disputeStatus,
          resolutionNotes
        }
      });

      // 2. Update engagement contract status
      await tx.engagement.update({
        where: { id: dispute.engagementId },
        data: { status: engagementStatus }
      });

      // 3. Process Ledger Ledger operations
      if (action === 'REFUND') {
        // Refund back to Customer
        await tx.paymentTransactionLedger.create({
          data: {
            userId: dispute.engagement.customerId,
            amount: dispute.engagement.amount,
            type: 'REFUND',
            description: `Escrow refund for engagement ID: ${dispute.engagementId} due to dispute resolution`
          }
        });
      } else {
        // Release hold to Creator
        await tx.paymentTransactionLedger.create({
          data: {
            userId: dispute.engagement.creatorId,
            amount: dispute.engagement.amount,
            type: 'RELEASE',
            description: `Escrow payout release for engagement ID: ${dispute.engagementId} due to dispute resolution`
          }
        });
      }

      return resolved;
    });

    const resolutionStatusText = action === 'REFUND' ? 'Refunded' : 'Completed';

    NotificationService.createNotification(
      dispute.engagement.creatorId,
      'Contract Status Changed',
      `The dispute on contract "${dispute.engagementId}" has been resolved. Contract status is now ${resolutionStatusText}.`
    ).catch(err => console.error(err));

    NotificationService.createNotification(
      dispute.engagement.customerId,
      'Contract Status Changed',
      `The dispute on contract "${dispute.engagementId}" has been resolved. Contract status is now ${resolutionStatusText}.`
    ).catch(err => console.error(err));

    return resolvedDispute;
  }

  public static async suspendUser(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED') {
    const user = await prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    return prisma.authUser.update({
      where: { id: userId },
      data: { status }
    });
  }

  public static async reviewCreator(
    creatorId: string,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'UNDER_REVIEW',
    reviewerId: string,
    rejectionReason?: string
  ) {
    const profile = await prisma.profileCreator.findUnique({
      where: { id: creatorId }
    });

    if (!profile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    let verificationStatus: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'UNDER_REVIEW';
    let isApproved = profile.isApproved;

    if (action === 'APPROVE') {
      verificationStatus = 'VERIFIED';
      isApproved = true;
    } else if (action === 'REJECT') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw { status: 400, message: 'Rejection reason is required' };
      }
      verificationStatus = 'REJECTED';
      isApproved = false;
    } else if (action === 'SUSPEND') {
      verificationStatus = 'SUSPENDED';
      isApproved = false;
    } else {
      verificationStatus = 'UNDER_REVIEW';
    }

    const updatedProfile = await prisma.profileCreator.update({
      where: { id: creatorId },
      data: {
        verificationStatus,
        isApproved,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: action === 'REJECT' ? rejectionReason : null
      }
    });

    if (action === 'APPROVE') {
      NotificationService.createNotification(
        profile.userId,
        'Creator Verification Approved',
        'Congratulations! Your creator profile has been verified and approved.'
      ).catch(err => console.error(err));
    } else if (action === 'REJECT') {
      NotificationService.createNotification(
        profile.userId,
        'Creator Verification Rejected',
        `Your creator profile verification was rejected. Reason: ${rejectionReason}`
      ).catch(err => console.error(err));
    } else if (action === 'SUSPEND') {
      NotificationService.createNotification(
        profile.userId,
        'Creator Verification Suspended',
        'Your verification status has been suspended.'
      ).catch(err => console.error(err));
    }

    return updatedProfile;
  }

  public static async reviewBusiness(
    customerId: string,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'UNDER_REVIEW',
    reviewerId: string,
    rejectionReason?: string
  ) {
    const customerProfile = await prisma.profileCustomer.findUnique({
      where: { id: customerId }
    });

    if (!customerProfile) {
      throw { status: 404, message: 'Customer profile not found' };
    }

    let status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'UNDER_REVIEW';
    let customerVerified = false;

    if (action === 'APPROVE') {
      status = 'VERIFIED';
      customerVerified = true;
    } else if (action === 'REJECT') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw { status: 400, message: 'Rejection reason is required' };
      }
      status = 'REJECTED';
    } else if (action === 'SUSPEND') {
      status = 'SUSPENDED';
    } else {
      status = 'UNDER_REVIEW';
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedVerification = await tx.businessVerification.update({
        where: { customerId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          rejectionReason: action === 'REJECT' ? rejectionReason : null
        }
      });

      if (action === 'APPROVE' || action === 'REJECT' || action === 'SUSPEND') {
        await tx.profileCustomer.update({
          where: { id: customerId },
          data: { isVerified: customerVerified }
        });
      }

      return updatedVerification;
    });

    if (action === 'APPROVE') {
      NotificationService.createNotification(
        customerProfile.userId,
        'Business Verification Approved',
        'Congratulations! Your business verification profile has been verified and approved.'
      ).catch(err => console.error(err));
    } else if (action === 'REJECT') {
      NotificationService.createNotification(
        customerProfile.userId,
        'Business Verification Rejected',
        `Your business verification was rejected. Reason: ${rejectionReason}`
      ).catch(err => console.error(err));
    } else if (action === 'SUSPEND') {
      NotificationService.createNotification(
        customerProfile.userId,
        'Business Verification Suspended',
        'Your business verification status has been suspended.'
      ).catch(err => console.error(err));
    }

    return result;
  }

  public static async approveCreatorProfile(creatorId: string) {
    // Kept for backward compatibility but routes to reviewCreator
    return this.reviewCreator(creatorId, 'APPROVE', 'admin-legacy');
  }

  public static async getDisputes() {
    return prisma.engagementDispute.findMany({
      include: {
        engagement: true,
        initiator: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public static async getVerificationQueue() {
    return prisma.profileCreator.findMany({
      where: {
        verificationStatus: {
          in: ['PENDING', 'UNDER_REVIEW']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  }

  public static async getBusinessVerificationQueue() {
    return prisma.businessVerification.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW']
        }
      },
      include: {
        customer: true
      }
    });
  }

  public static async getUsers() {
    return prisma.authUser.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public static async updateUserRole(userId: string, newRole: any) {
    const user = await prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update user role
      const updatedUser = await tx.authUser.update({
        where: { id: userId },
        data: { role: newRole },
        select: { id: true, email: true, role: true }
      });

      // 2. Ensure matching profile exists if promoting to creator or customer (if not exists already)
      if (newRole === 'CUSTOMER') {
        const profile = await tx.profileCustomer.findUnique({ where: { userId } });
        if (!profile) {
          await tx.profileCustomer.create({
            data: {
              userId,
              fullName: 'Promoted Customer'
            }
          });
        }
      } else if (newRole === 'CREATOR') {
        const profile = await tx.profileCreator.findUnique({ where: { userId } });
        if (!profile) {
          await tx.profileCreator.create({
            data: {
              userId,
              displayName: 'Promoted Creator',
              isApproved: true,
              verificationStatus: 'VERIFIED'
            }
          });
        }
      }

      return updatedUser;
    });
  }
}
