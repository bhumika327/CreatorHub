import { prisma } from '../../prisma/client';
import { DisputeStatus, EngagementStatus } from '@prisma/client';

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

    return prisma.$transaction(async (tx) => {
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

    return prisma.$transaction(async (tx) => {
      const disputeStatus = action === 'REFUND' ? DisputeStatus.RESOLVED_REFUNDED : DisputeStatus.RESOLVED_RELEASED;
      const engagementStatus = action === 'REFUND' ? EngagementStatus.REFUNDED : EngagementStatus.COMPLETED;

      // 1. Update dispute state
      const resolvedDispute = await tx.engagementDispute.update({
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

      return resolvedDispute;
    });
  }

  public static async approveCreatorProfile(creatorId: string) {
    const profile = await prisma.profileCreator.findUnique({
      where: { id: creatorId }
    });

    if (!profile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.profileCreator.update({
      where: { id: creatorId },
      data: { isApproved: true }
    });
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
      where: { isApproved: false },
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
}
