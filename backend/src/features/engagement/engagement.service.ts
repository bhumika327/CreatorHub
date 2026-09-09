import { prisma } from '../../prisma/client';
import { SubmitProposalInput } from './engagement.dto';
import { ProposalStatus, EngagementStatus, UserRole, RequirementStatus, MilestoneStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

export class EngagementService {
  private static validateRequirementTransition(from: RequirementStatus, to: RequirementStatus) {
    const allowed: Record<RequirementStatus, RequirementStatus[]> = {
      DRAFT: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['PROPOSALS_RECEIVED', 'SHORTLISTED', 'HIRED', 'CANCELLED'],
      PROPOSALS_RECEIVED: ['SHORTLISTED', 'HIRED', 'CANCELLED'],
      SHORTLISTED: ['HIRED', 'CANCELLED'],
      HIRED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['DELIVERED', 'CANCELLED', 'DISPUTED'],
      DELIVERED: ['COMPLETED', 'DISPUTED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      DISPUTED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    };
    if (from !== to && (!allowed[from] || !allowed[from].includes(to))) {
      throw { status: 400, message: `Invalid requirement status transition from ${from} to ${to}` };
    }
  }

  private static async verifyCreatorAvailability(creatorId: string, startDate: Date, deadline: Date) {
    // 1. Check availability calendar for blocked dates
    const blockedDates = await prisma.profileAvailability.findMany({
      where: {
        creatorId,
        date: {
          gte: startDate,
          lte: deadline
        },
        isAvailable: false
      }
    });
    if (blockedDates.length > 0) {
      throw {
        status: 400,
        message: `Creator is marked unavailable on: ${blockedDates.map(d => d.date.toISOString().split('T')[0]).join(', ')}`
      };
    }

    // 2. Check for overlapping active contracts
    const overlappingContracts = await prisma.engagement.findMany({
      where: {
        creatorId,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        OR: [
          {
            startDate: { lte: deadline },
            deadline: { gte: startDate }
          }
        ]
      }
    });
    if (overlappingContracts.length > 0) {
      throw { status: 400, message: 'Creator has overlapping active contracts during this period' };
    }
  }

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

    // Check if creator already submitted a bid and it is active (not rejected/withdrawn)
    const existing = await prisma.engagementProposal.findFirst({
      where: {
        creatorId,
        requirementId,
        status: {
          in: ['SUBMITTED', 'VIEWED', 'SHORTLISTED', 'ACCEPTED']
        }
      }
    });

    if (existing) {
      throw { status: 400, message: 'You already have an active proposal for this requirement' };
    }

    const proposal = await prisma.$transaction(async (tx) => {
      const proposal = await tx.engagementProposal.create({
        data: {
          requirementId,
          creatorId,
          coverLetter: data.coverLetter,
          bidAmount: data.bidAmount,
          deliveryDays: data.deliveryDays,
          status: 'SUBMITTED'
        }
      });

      // Update requirement status if it is currently PUBLISHED
      if (requirement.status === 'PUBLISHED') {
        await tx.catalogRequirement.update({
          where: { id: requirementId },
          data: { status: 'PROPOSALS_RECEIVED' }
        });
      }

      await tx.engagementProposalHistory.create({
        data: {
          proposalId: proposal.id,
          toStatus: 'SUBMITTED',
          changedById: creatorId,
          comment: 'Proposal submitted'
        }
      });

      return proposal;
    });

    // Notify the customer
    NotificationService.createNotification(
      requirement.customerId,
      'New Proposal Received',
      `A creator has submitted a new proposal for your requirement "${requirement.title}" with a bid of $${data.bidAmount}.`
    ).catch(err => console.error('[Notification Trigger] Failed to send new proposal notification:', err));

    return proposal;
  }

  public static async acceptProposal(
    customerId: string,
    proposalId: string,
    milestoneInput?: { title: string; description: string; amount: number; dueDate?: string }[]
  ) {
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

    if (proposal.status !== 'SUBMITTED' && proposal.status !== 'VIEWED' && proposal.status !== 'SHORTLISTED') {
      throw { status: 400, message: 'Proposal cannot be accepted in its current status' };
    }

    // Calculate start and deadline
    const startDate = new Date();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + proposal.deliveryDays);

    // Verify creator availability & overlapping contracts
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId: proposal.creatorId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }
    await this.verifyCreatorAvailability(creatorProfile.id, startDate, deadline);

    // Verify requirement transition to HIRED
    this.validateRequirementTransition(proposal.requirement.status, 'HIRED');

    // Milestones definition & Sum verification
    const milestonesToCreate = milestoneInput || [
      {
        title: 'Final Deliverable',
        description: 'Complete delivery of project requirements',
        amount: proposal.bidAmount,
        dueDate: deadline.toISOString()
      }
    ];

    let totalMilestonesAmount = 0;
    for (const m of milestonesToCreate) {
      totalMilestonesAmount += Number(m.amount);
    }

    if (Math.abs(totalMilestonesAmount - proposal.bidAmount) > 0.01) {
      throw {
        status: 400,
        message: `Total milestone amount (${totalMilestonesAmount}) must equal contract agreed amount (${proposal.bidAmount}) exactly`
      };
    }

    // Execute acceptance operations in database transaction
    const engagement = await prisma.$transaction(async (tx) => {
      // 1. Accept this proposal
      const accepted = await tx.engagementProposal.update({
        where: { id: proposalId },
        data: { status: 'ACCEPTED' }
      });

      // 2. Reject all other bids for this requirement
      const competing = await tx.engagementProposal.findMany({
        where: {
          requirementId: proposal.requirementId,
          id: { not: proposalId },
          status: { in: ['SUBMITTED', 'VIEWED', 'SHORTLISTED'] }
        }
      });

      await tx.engagementProposal.updateMany({
        where: {
          requirementId: proposal.requirementId,
          id: { not: proposalId },
          status: { in: ['SUBMITTED', 'VIEWED', 'SHORTLISTED'] }
        },
        data: { status: 'REJECTED' }
      });

      // 3. Log Proposal Histories
      await tx.engagementProposalHistory.create({
        data: {
          proposalId,
          fromStatus: proposal.status,
          toStatus: 'ACCEPTED',
          changedById: customerId,
          comment: 'Proposal accepted'
        }
      });

      for (const comp of competing) {
        await tx.engagementProposalHistory.create({
          data: {
            proposalId: comp.id,
            fromStatus: comp.status,
            toStatus: 'REJECTED',
            changedById: customerId,
            comment: 'Competing proposal rejected automatically on contract hire'
          }
        });
      }

      // 4. Update requirement status
      await tx.catalogRequirement.update({
        where: { id: proposal.requirementId },
        data: { status: 'HIRED' }
      });

      // 5. Create Engagement contract
      const engagement = await tx.engagement.create({
        data: {
          requirementId: proposal.requirementId,
          creatorId: proposal.creatorId,
          customerId,
          amount: proposal.bidAmount,
          status: 'ACTIVE',
          startDate,
          deadline,
          proposalId
        }
      });

      // 6. Create Chat Room
      await tx.chatRoom.create({
        data: {
          engagementId: engagement.id
        }
      });

      // 7. Milestones are created in PENDING state; the customer will fund them manually.

      // 8. Create Milestones
      for (const m of milestonesToCreate) {
        await tx.engagementMilestone.create({
          data: {
            engagementId: engagement.id,
            title: m.title,
            description: m.description,
            amount: m.amount,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            status: 'PENDING'
          }
        });
      }

      return engagement;
    }, {
      timeout: 15000
    });

    // Notify the accepted creator
    NotificationService.createNotification(
      proposal.creatorId,
      'Proposal Accepted & Contract Created',
      `Your proposal for "${proposal.requirement.title}" has been accepted! A new active contract has been initialized.`
    ).catch(err => console.error('[Notification Trigger] Failed to send proposal accepted notification:', err));

    // Notify competing creators of rejection
    prisma.engagementProposal.findMany({
      where: {
        requirementId: proposal.requirementId,
        id: { not: proposalId },
        status: 'REJECTED'
      }
    }).then(competing => {
      for (const comp of competing) {
        NotificationService.createNotification(
          comp.creatorId,
          'Proposal Rejected',
          `Your proposal for "${proposal.requirement.title}" was not selected as another bid was accepted.`
        ).catch(err => console.error('[Notification Trigger] Failed to send competing rejection notification:', err));
      }
    }).catch(err => console.error('[Notification Trigger] Failed to fetch competing proposals:', err));

    return engagement;
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

    if (proposal.status !== 'SUBMITTED' && proposal.status !== 'VIEWED' && proposal.status !== 'SHORTLISTED') {
      throw { status: 400, message: 'Proposal has already been processed' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.engagementProposal.update({
        where: { id: proposalId },
        data: { status: 'REJECTED' }
      });

      await tx.engagementProposalHistory.create({
        data: {
          proposalId,
          fromStatus: proposal.status,
          toStatus: 'REJECTED',
          changedById: customerId,
          comment: 'Proposal rejected'
        }
      });

      return updated;
    });

    NotificationService.createNotification(
      proposal.creatorId,
      'Proposal Rejected',
      `Your proposal for "${proposal.requirement.title}" has been rejected by the customer.`
    ).catch(err => console.error('[Notification Trigger] Failed to send proposal rejected notification:', err));

    return updated;
  }

  public static async updateProposalStatus(userId: string, proposalId: string, newStatus: ProposalStatus, comment?: string) {
    const proposal = await prisma.engagementProposal.findUnique({
      where: { id: proposalId },
      include: { requirement: true }
    });

    if (!proposal) {
      throw { status: 404, message: 'Proposal not found' };
    }

    // Auth check: Creator can withdraw, Customer can view/shortlist/accept/reject
    const isCreator = proposal.creatorId === userId;
    const isCustomer = proposal.requirement.customerId === userId;

    if (!isCreator && !isCustomer) {
      throw { status: 403, message: 'Unauthorized' };
    }

    if (newStatus === 'WITHDRAWN' && !isCreator) {
      throw { status: 403, message: 'Only the creator can withdraw their proposal' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.engagementProposal.update({
        where: { id: proposalId },
        data: { status: newStatus }
      });

      await tx.engagementProposalHistory.create({
        data: {
          proposalId,
          fromStatus: proposal.status,
          toStatus: newStatus,
          changedById: userId,
          comment: comment || `Status updated to ${newStatus.toLowerCase()}`
        }
      });

      return updated;
    });

    if (newStatus === 'SHORTLISTED') {
      NotificationService.createNotification(
        proposal.creatorId,
        'Proposal Shortlisted',
        `Your proposal for "${proposal.requirement.title}" has been shortlisted by the customer!`
      ).catch(err => console.error(err));
    } else if (newStatus === 'REJECTED') {
      NotificationService.createNotification(
        proposal.creatorId,
        'Proposal Rejected',
        `Your proposal for "${proposal.requirement.title}" has been rejected.`
      ).catch(err => console.error(err));
    } else if (newStatus === 'ACCEPTED') {
      NotificationService.createNotification(
        proposal.creatorId,
        'Proposal Accepted',
        `Your proposal for "${proposal.requirement.title}" has been accepted!`
      ).catch(err => console.error(err));
    } else if (newStatus === 'WITHDRAWN') {
      NotificationService.createNotification(
        proposal.requirement.customerId,
        'Proposal Withdrawn',
        `The proposal submitted for your requirement "${proposal.requirement.title}" has been withdrawn by the creator.`
      ).catch(err => console.error(err));
    }

    return updated;
  }

  public static async submitMilestoneWork(creatorId: string, milestoneId: string, deliverableUrl: string, deliverableNotes?: string) {
    const milestone = await prisma.engagementMilestone.findUnique({
      where: { id: milestoneId },
      include: { engagement: true }
    });

    if (!milestone) {
      throw { status: 404, message: 'Milestone not found' };
    }

    if (milestone.engagement.creatorId !== creatorId) {
      throw { status: 403, message: 'Unauthorized: only the hired creator can submit work' };
    }

    if (milestone.status !== 'PENDING' && milestone.status !== 'IN_PROGRESS' && milestone.status !== 'REJECTED') {
      throw { status: 400, message: 'Work has already been submitted or approved for this milestone' };
    }

    // Verify that the milestone payment is funded and held in escrow
    const payment = await prisma.paymentTransactionLedger.findFirst({
      where: {
        milestoneId,
        type: 'ESCROW_HOLD',
        status: 'HELD'
      }
    });

    if (!payment) {
      throw { status: 400, message: 'Milestone must be funded before work can be submitted' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.engagementMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'SUBMITTED',
          deliverableUrl,
          deliverableNotes,
          submittedAt: new Date()
        }
      });

      // Update engagement status to IN_PROGRESS if currently ACTIVE
      if (milestone!.engagement.status === 'ACTIVE') {
        await tx.engagement.update({
          where: { id: milestone!.engagementId },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return updated;
    });

    // Notify the customer of work submission
    NotificationService.createNotification(
      milestone!.engagement.customerId,
      'Milestone Deliverable Submitted',
      `The creator has submitted work for the milestone "${milestone!.title}". Please review and approve.`
    ).catch(err => console.error(err));

    // Notify counterparties if status changes to IN_PROGRESS
    if (milestone!.engagement.status === 'ACTIVE') {
      NotificationService.createNotification(
        milestone!.engagement.creatorId,
        'Contract Status Changed',
        `Contract status for requirement "${milestone!.engagement.id}" is now In Progress.`
      ).catch(err => console.error(err));

      NotificationService.createNotification(
        milestone!.engagement.customerId,
        'Contract Status Changed',
        `Contract status for requirement "${milestone!.engagement.id}" is now In Progress.`
      ).catch(err => console.error(err));
    }

    return updated;
  }

  public static async approveMilestoneWork(customerId: string, milestoneId: string) {
    const milestone = await prisma.engagementMilestone.findUnique({
      where: { id: milestoneId },
      include: { engagement: true }
    });

    if (!milestone) {
      throw { status: 404, message: 'Milestone not found' };
    }

    if (milestone.engagement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the client can approve milestone work' };
    }

    if (milestone.status !== 'SUBMITTED') {
      throw { status: 400, message: 'Milestone is not in a submitted state' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Release milestone escrow payment from HELD to RELEASED status
      const escrowTx = await tx.paymentTransactionLedger.findFirst({
        where: {
          milestoneId,
          type: 'ESCROW_HOLD',
          status: 'HELD'
        }
      });

      if (!escrowTx) {
        throw { status: 400, message: 'No active escrow hold transaction found for this milestone' };
      }

      await tx.paymentTransactionLedger.update({
        where: { id: escrowTx.id },
        data: { status: 'RELEASED' }
      });

      // 2. Approve milestone work
      const updated = await tx.engagementMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });

      // Check if all milestones are approved for this engagement
      const allMilestones = await tx.engagementMilestone.findMany({
        where: { engagementId: milestone!.engagementId }
      });
      const allApproved = allMilestones.every(m => m.status === 'APPROVED');

      if (allApproved) {
        // Complete the contract & update requirement status to COMPLETED
        await tx.engagement.update({
          where: { id: milestone!.engagementId },
          data: { status: 'DELIVERED' } // Sets status representing completion
        });

        await tx.catalogRequirement.update({
          where: { id: milestone!.engagement.requirementId },
          data: { status: 'DELIVERED' }
        });
      }

      return updated;
    });

    // Notify the creator of approval
    NotificationService.createNotification(
      milestone!.engagement.creatorId,
      'Milestone Work Approved',
      `Your work submission for the milestone "${milestone!.title}" has been approved by the customer.`
    ).catch(err => console.error(err));

    // Check if contract status changed to DELIVERED
    prisma.engagementMilestone.findMany({
      where: { engagementId: milestone!.engagementId }
    }).then(allMilestones => {
      const allApproved = allMilestones.every(m => m.status === 'APPROVED');
      if (allApproved) {
        NotificationService.createNotification(
          milestone!.engagement.creatorId,
          'Contract Status Changed',
          `Your contract has been completed and marked as Delivered. Funds will be released soon.`
        ).catch(err => console.error(err));

        NotificationService.createNotification(
          milestone!.engagement.customerId,
          'Contract Status Changed',
          `Your contract has been completed and marked as Delivered.`
        ).catch(err => console.error(err));
      }
    }).catch(err => console.error(err));

    return updated;
  }

  public static async rejectMilestoneWork(customerId: string, milestoneId: string, notes: string) {
    const milestone = await prisma.engagementMilestone.findUnique({
      where: { id: milestoneId },
      include: { engagement: true }
    });

    if (!milestone) {
      throw { status: 404, message: 'Milestone not found' };
    }

    if (milestone.engagement.customerId !== customerId) {
      throw { status: 403, message: 'Unauthorized: only the client can reject milestone work' };
    }

    if (milestone.status !== 'SUBMITTED') {
      throw { status: 400, message: 'Milestone is not in a submitted state' };
    }

    const updated = await prisma.engagementMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'REJECTED',
        deliverableNotes: notes
      }
    });

    NotificationService.createNotification(
      milestone!.engagement.creatorId,
      'Milestone Work Rejected',
      `Your work submission for the milestone "${milestone!.title}" was rejected. Feedback: "${notes}"`
    ).catch(err => console.error(err));

    return updated;
  }

  public static async submitDeliverable(creatorId: string, engagementId: string) {
    // Legacy support for single deliverable submissions
    const milestones = await prisma.engagementMilestone.findMany({
      where: { engagementId }
    });
    if (milestones.length > 0) {
      return this.submitMilestoneWork(creatorId, milestones[0].id, 'legacy-url', 'Legacy full-project submission');
    }

    return prisma.engagement.update({
      where: { id: engagementId },
      data: { status: 'DELIVERED' }
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

    const completed = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const completed = await tx.engagement.update({
        where: { id: engagementId },
        data: { status: 'COMPLETED' }
      });

      // Update requirement status
      await tx.catalogRequirement.update({
        where: { id: engagement.requirementId },
        data: { status: 'COMPLETED' }
      });

      // 2. Release funds to Creator Ledger
      await tx.paymentTransactionLedger.create({
        data: {
          payerId: engagement.customerId,
          payeeId: engagement.creatorId,
          engagementId: engagement.id,
          amount: engagement.amount,
          type: 'RELEASE',
          status: 'RELEASED',
          description: `Escrow release payout for engagement ID: ${engagement.id}`
        }
      });

      return completed;
    });

    NotificationService.createNotification(
      completed.creatorId,
      'Contract Status Changed',
      `Contract has been marked as Completed and funds have been released to your payouts wallet!`
    ).catch(err => console.error(err));

    NotificationService.createNotification(
      completed.customerId,
      'Contract Status Changed',
      `Contract has been marked as Completed.`
    ).catch(err => console.error(err));

    return completed;
  }

  public static async getProposals(userId: string, role: UserRole) {
    if (role === UserRole.CREATOR) {
      return prisma.engagementProposal.findMany({
        where: { creatorId: userId },
        include: {
          requirement: {
            include: {
              customer: {
                select: {
                  id: true,
                  email: true,
                  customerProfile: true
                }
              }
            }
          }
        },
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
        include: { requirement: true, chatRooms: true, milestones: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return prisma.engagement.findMany({
        where: { customerId: userId },
        include: { requirement: true, chatRooms: true, milestones: true },
        orderBy: { createdAt: 'desc' }
      });
    }
  }
}
