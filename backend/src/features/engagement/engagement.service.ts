import { prisma } from '../../prisma/client';
import { SubmitProposalInput } from './engagement.dto';
import { ProposalStatus, EngagementStatus, UserRole } from '@prisma/client';
import { PaymentService } from '../payment/payment.service';

export class EngagementService {
  public static async submitProposal(creatorId: string, requirementId: string, data: SubmitProposalInput) {
    const requirement = await prisma.catalogRequirement.findUnique({
      where: { id: requirementId }
    });

    if (!requirement) {
      throw { status: 404, message: 'Requirement not found' };
    }

    if (requirement.customerId === creatorId) {
      throw { status: 400, message: 'Cannot bid on your own requirement' };
    }

    // Check if creator already submitted a bid
    const existing = await prisma.engagementProposal.findFirst({
      where: { creatorId, requirementId }
    });

    if (existing) {
      throw { status: 400, message: 'You have already submitted a proposal for this requirement' };
    }

    return prisma.engagementProposal.create({
      data: {
        requirementId,
        creatorId,
        coverLetter: data.coverLetter,
        bidAmount: data.bidAmount,
        deliveryDays: data.deliveryDays,
        status: ProposalStatus.PENDING
      }
    });
  }

  public static async acceptProposal(customerId: string, proposalId: string) {
    const proposal = await prisma.engagementProposal.findUnique({
      where: { id: proposalId },
      include: { requirement: true }
    });

    if (!proposal) {
      throw { status: 404, message: 'Proposal not found' };
    }

    if (proposal.requirement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the requirement owner can accept proposals' };
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw { status: 400, message: 'Proposal has already been processed' };
    }

    // Execute acceptance operations in database transaction
    return prisma.$transaction(async (tx) => {
      // 1. Accept this proposal
      const accepted = await tx.engagementProposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.ACCEPTED }
      });

      // 2. Reject all other bids for this requirement
      await tx.engagementProposal.updateMany({
        where: {
          requirementId: proposal.requirementId,
          id: { not: proposalId }
        },
        data: { status: ProposalStatus.REJECTED }
      });

      // 3. Create Engagement contract
      const engagement = await tx.engagement.create({
        data: {
          requirementId: proposal.requirementId,
          creatorId: proposal.creatorId,
          customerId,
          amount: proposal.bidAmount,
          status: EngagementStatus.ESCROW_HOLD
        }
      });

      // 4. Create Chat Room for on-platform conversation
      await tx.chatRoom.create({
        data: {
          engagementId: engagement.id
        }
      });

      // 5. Deduct/Hold budget inside Mock Payment Ledger
      await tx.paymentTransactionLedger.create({
        data: {
          userId: customerId,
          amount: -proposal.bidAmount,
          type: 'ESCROW_HOLD',
          description: `Escrow hold for engagement ID: ${engagement.id}`
        }
      });

      return engagement;
    });
  }

  public static async rejectProposal(customerId: string, proposalId: string) {
    const proposal = await prisma.engagementProposal.findUnique({
      where: { id: proposalId },
      include: { requirement: true }
    });

    if (!proposal) {
      throw { status: 404, message: 'Proposal not found' };
    }

    if (proposal.requirement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the requirement owner can reject proposals' };
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw { status: 400, message: 'Proposal has already been processed' };
    }

    return prisma.engagementProposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.REJECTED }
    });
  }

  public static async submitDeliverable(creatorId: string, engagementId: string) {
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId }
    });

    if (!engagement) {
      throw { status: 404, message: 'Engagement not found' };
    }

    if (engagement.creatorId !== creatorId) {
      throw { status: 403, message: 'Unauthorized: only the hired creator can submit work' };
    }

    if (engagement.status !== EngagementStatus.ESCROW_HOLD) {
      throw { status: 400, message: 'Cannot submit deliverable in current engagement status' };
    }

    return prisma.engagement.update({
      where: { id: engagementId },
      data: { status: EngagementStatus.DELIVERED }
    });
  }

  public static async completeEngagement(customerId: string, engagementId: string) {
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId }
    });

    if (!engagement) {
      throw { status: 404, message: 'Engagement not found' };
    }

    if (engagement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the client can approve completion' };
    }

    if (engagement.status !== EngagementStatus.DELIVERED && engagement.status !== EngagementStatus.ESCROW_HOLD) {
      throw { status: 400, message: 'Engagement cannot be completed from current state' };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update status
      const completed = await tx.engagement.update({
        where: { id: engagementId },
        data: { status: EngagementStatus.COMPLETED }
      });

      // 2. Release funds to Creator Ledger
      await tx.paymentTransactionLedger.create({
        data: {
          userId: engagement.creatorId,
          amount: engagement.amount,
          type: 'RELEASE',
          description: `Escrow release payout for engagement ID: ${engagement.id}`
        }
      });

      return completed;
    });
  }

  public static async getProposals(userId: string, role: UserRole) {
    if (role === UserRole.CREATOR) {
      return prisma.engagementProposal.findMany({
        where: { creatorId: userId },
        include: { requirement: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return prisma.engagementProposal.findMany({
        where: { requirement: { customerId: userId } },
        include: { requirement: true, creator: { select: { id: true, email: true, creatorProfile: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  public static async getEngagements(userId: string, role: UserRole) {
    if (role === UserRole.CREATOR) {
      return prisma.engagement.findMany({
        where: { creatorId: userId },
        include: { requirement: true, chatRooms: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return prisma.engagement.findMany({
        where: { customerId: userId },
        include: { requirement: true, chatRooms: true },
        orderBy: { createdAt: 'desc' }
      });
    }
  }
}
