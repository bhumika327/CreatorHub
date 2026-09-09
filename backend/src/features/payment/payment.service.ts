import { prisma } from '../../prisma/client';
import { TransactionType, TransactionStatus, MilestoneStatus, EngagementStatus, UserRole } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { Decimal } from '@prisma/client/runtime/library';

export class PaymentService {
  /**
   * Logs a record in the transaction ledger simulating payment deposit, hold, release, or refund
   */
  public static async recordTransaction(
    payerId: string,
    payeeId: string,
    amount: number | Decimal,
    type: TransactionType,
    status: TransactionStatus,
    description: string,
    engagementId?: string,
    milestoneId?: string
  ) {
    return prisma.paymentTransactionLedger.create({
      data: {
        payerId,
        payeeId,
        amount,
        type,
        status,
        description,
        engagementId,
        milestoneId
      }
    });
  }

  /**
   * Places milestone funds into escrow / held state
   */
  public static async fundMilestone(milestoneId: string, customerId: string) {
    const milestone = await prisma.engagementMilestone.findUnique({
      where: { id: milestoneId },
      include: { engagement: true }
    });

    if (!milestone) {
      throw { status: 404, message: 'Milestone not found' };
    }

    if (milestone.engagement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the client of this engagement can fund milestones' };
    }

    if (milestone.status !== MilestoneStatus.PENDING) {
      throw { status: 400, message: `Milestone cannot be funded in its current status: ${milestone.status}` };
    }

    // Verify no existing HELD or RELEASED transaction exists for this milestone
    const existingTx = await prisma.paymentTransactionLedger.findFirst({
      where: {
        milestoneId,
        type: TransactionType.ESCROW_HOLD,
        status: { in: [TransactionStatus.HELD, TransactionStatus.RELEASED] }
      }
    });

    if (existingTx) {
      throw { status: 400, message: 'This milestone has already been funded or released' };
    }

    const providerRef = `pm_mock_${Math.random().toString(36).substring(2, 11)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the ESCROW_HOLD ledger transaction
      const ledgerEntry = await tx.paymentTransactionLedger.create({
        data: {
          engagementId: milestone.engagementId,
          milestoneId: milestone.id,
          payerId: customerId,
          payeeId: milestone.engagement.creatorId,
          amount: milestone.amount,
          type: TransactionType.ESCROW_HOLD,
          status: TransactionStatus.HELD,
          providerRef,
          description: `Escrow funding for milestone: ${milestone.title}`
        }
      });

      // 2. Transition milestone status to IN_PROGRESS
      await tx.engagementMilestone.update({
        where: { id: milestoneId },
        data: { status: MilestoneStatus.IN_PROGRESS }
      });

      // 3. Transition engagement status to ACTIVE or IN_PROGRESS if PENDING
      if (milestone.engagement.status === EngagementStatus.PENDING) {
        await tx.engagement.update({
          where: { id: milestone.engagementId },
          data: { status: EngagementStatus.ACTIVE }
        });
      }

      return ledgerEntry;
    });

    // Notify counterparties
    NotificationService.createNotification(
      customerId,
      'Milestone Funded',
      `You successfully funded the milestone "${milestone.title}" with $${milestone.amount}.`
    ).catch(err => console.error(err));

    NotificationService.createNotification(
      milestone.engagement.creatorId,
      'Milestone Funded',
      `Milestone "${milestone.title}" ($${milestone.amount}) has been funded by the customer and is held in escrow.`
    ).catch(err => console.error(err));

    return result;
  }

  /**
   * Releases milestone payment from escrow to the creator
   */
  public static async releaseMilestone(milestoneId: string, customerId: string) {
    const milestone = await prisma.engagementMilestone.findUnique({
      where: { id: milestoneId },
      include: { engagement: true }
    });

    if (!milestone) {
      throw { status: 404, message: 'Milestone not found' };
    }

    if (milestone.engagement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the client of this engagement can release milestone payments' };
    }

    // Find the HELD escrow transaction for this milestone
    const escrowTx = await prisma.paymentTransactionLedger.findFirst({
      where: {
        milestoneId,
        type: TransactionType.ESCROW_HOLD,
        status: TransactionStatus.HELD
      }
    });

    if (!escrowTx) {
      throw { status: 400, message: 'No active escrow hold transaction found for this milestone' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the ledger transaction status to RELEASED
      const updatedTx = await tx.paymentTransactionLedger.update({
        where: { id: escrowTx.id },
        data: { status: TransactionStatus.RELEASED }
      });

      // 2. Update milestone status to APPROVED if not already APPROVED
      if (milestone.status !== MilestoneStatus.APPROVED) {
        await tx.engagementMilestone.update({
          where: { id: milestoneId },
          data: {
            status: MilestoneStatus.APPROVED,
            approvedAt: new Date()
          }
        });
      }

      // 3. Check if all milestones are now approved
      const allMilestones = await tx.engagementMilestone.findMany({
        where: { engagementId: milestone.engagementId }
      });

      const allApproved = allMilestones.every(m => m.id === milestoneId ? true : m.status === MilestoneStatus.APPROVED);

      if (allApproved) {
        await tx.engagement.update({
          where: { id: milestone.engagementId },
          data: { status: EngagementStatus.DELIVERED }
        });

        await tx.catalogRequirement.update({
          where: { id: milestone.engagement.requirementId },
          data: { status: 'DELIVERED' }
        });
      }

      return updatedTx;
    });

    // Notify counterparties
    NotificationService.createNotification(
      customerId,
      'Payment Released',
      `Escrow payment of $${milestone.amount} for milestone "${milestone.title}" has been released.`
    ).catch(err => console.error(err));

    NotificationService.createNotification(
      milestone.engagement.creatorId,
      'Payment Released',
      `Good news! $${milestone.amount} for milestone "${milestone.title}" has been released to your available balance.`
    ).catch(err => console.error(err));

    return result;
  }

  /**
   * Refunds payment when permitted
   */
  public static async refundTransaction(transactionId: string, userId: string, userRole: UserRole) {
    const txEntry = await prisma.paymentTransactionLedger.findUnique({
      where: { id: transactionId },
      include: { milestone: { include: { engagement: true } } }
    });

    if (!txEntry) {
      throw { status: 404, message: 'Transaction not found' };
    }

    const isPayer = txEntry.payerId === userId;
    const isManager = userRole === UserRole.MANAGER;

    if (!isPayer && !isManager) {
      throw { status: 403, message: 'Unauthorized: only the payer or a manager can issue refunds' };
    }

    if (txEntry.status !== TransactionStatus.HELD) {
      throw { status: 400, message: `Only transactions in HELD status can be refunded. Current status: ${txEntry.status}` };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update status to REFUNDED
      const updatedTx = await tx.paymentTransactionLedger.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.REFUNDED }
      });

      // 2. If associated with a milestone, cancel the milestone
      if (txEntry.milestoneId) {
        await tx.engagementMilestone.update({
          where: { id: txEntry.milestoneId },
          data: { status: MilestoneStatus.CANCELLED }
        });
      }

      // 3. Check if all milestones are cancelled/refunded for the engagement
      if (txEntry.engagementId) {
        const milestones = await tx.engagementMilestone.findMany({
          where: { engagementId: txEntry.engagementId }
        });

        const allCancelled = milestones.every(m => m.status === MilestoneStatus.CANCELLED);
        if (allCancelled) {
          await tx.engagement.update({
            where: { id: txEntry.engagementId },
            data: { status: EngagementStatus.REFUNDED }
          });
        }
      }

      return updatedTx;
    });

    // Notify counterparties
    if (txEntry.payerId) {
      NotificationService.createNotification(
        txEntry.payerId,
        'Payment Refunded',
        `The milestone payment of $${txEntry.amount} has been refunded to your wallet.`
      ).catch(err => console.error(err));
    }

    if (txEntry.payeeId) {
      NotificationService.createNotification(
        txEntry.payeeId,
        'Payment Refunded',
        `A milestone payment of $${txEntry.amount} was refunded back to the client.`
      ).catch(err => console.error(err));
    }

    return result;
  }

  /**
   * Retrieves engagement payment history
   */
  public static async getEngagementPaymentHistory(engagementId: string, userId: string, userRole: UserRole) {
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId }
    });

    if (!engagement) {
      throw { status: 404, message: 'Engagement not found' };
    }

    const isMember = engagement.customerId === userId || engagement.creatorId === userId;
    const isManager = userRole === UserRole.MANAGER;

    if (!isMember && !isManager) {
      throw { status: 403, message: 'Unauthorized: cannot view other users engagement transactions' };
    }

    return prisma.paymentTransactionLedger.findMany({
      where: { engagementId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves ledger entries and aggregates balance & escrowBalance for the user
   */
  public static async getLedger(userId: string) {
    const transactions = await prisma.paymentTransactionLedger.findMany({
      where: {
        OR: [
          { payerId: userId },
          { payeeId: userId }
        ]
      },
      include: {
        engagement: {
          include: {
            requirement: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let balance = new Decimal(0);
    let escrowBalance = new Decimal(0);

    for (const tx of transactions) {
      const amount = tx.amount;

      // Escrow balance calculation (funds currently held in escrow)
      if (tx.type === TransactionType.ESCROW_HOLD && tx.status === TransactionStatus.HELD) {
        escrowBalance = escrowBalance.add(amount);
      }

      // Available balance calculation
      if (tx.type === TransactionType.DEPOSIT) {
        if (tx.payeeId === userId && tx.status === TransactionStatus.RELEASED) {
          balance = balance.add(amount);
        }
      } else if (tx.type === TransactionType.ESCROW_HOLD) {
        if (tx.payerId === userId) {
          // If customer, funding reduces balance
          if (tx.status === TransactionStatus.HELD || tx.status === TransactionStatus.RELEASED) {
            balance = balance.sub(amount);
          }
        }
        if (tx.payeeId === userId) {
          // If creator, released status increases balance
          if (tx.status === TransactionStatus.RELEASED) {
            balance = balance.add(amount);
          }
        }
      } else if (tx.type === TransactionType.RELEASE) {
        if (tx.payeeId === userId && tx.status === TransactionStatus.RELEASED) {
          balance = balance.add(amount);
        }
      } else if (tx.type === TransactionType.REFUND) {
        if (tx.payerId === userId && (tx.status === TransactionStatus.RELEASED || tx.status === TransactionStatus.REFUNDED)) {
          balance = balance.add(amount);
        }
      }
    }

    // Map to positive values for the frontend
    const mappedTransactions = transactions.map(tx => {
      // Return type appropriately based on user's role and transaction status
      let type: string = tx.type;
      if (tx.type === TransactionType.ESCROW_HOLD && tx.status === TransactionStatus.RELEASED) {
        type = 'RELEASE';
      } else if (tx.type === TransactionType.ESCROW_HOLD && tx.status === TransactionStatus.REFUNDED) {
        type = 'REFUND';
      }

      return {
        id: tx.id,
        amount: Number(tx.amount),
        type,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt,
        engagement: tx.engagement ? {
          requirement: tx.engagement.requirement ? {
            title: tx.engagement.requirement.title
          } : null
        } : null
      };
    });

    return {
      balance: Number(balance),
      escrowBalance: Number(escrowBalance),
      transactions: mappedTransactions
    };
  }
}
