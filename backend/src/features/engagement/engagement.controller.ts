import { Request, Response, NextFunction } from 'express';
import { SubmitProposalSchema } from './engagement.dto';
import { EngagementService } from './engagement.service';

export class EngagementController {
  public static async submitProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Content Creators can submit proposals' });
      }

      const parseResult = SubmitProposalSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const requirementId = req.params.requirementId;
      const proposal = await EngagementService.submitProposal(user.userId, requirementId, parseResult.data);

      res.status(201).json({
        success: true,
        message: 'Proposal bid submitted successfully',
        data: proposal
      });
    } catch (error) {
      next(error);
    }
  }

  public static async acceptProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customer clients can accept proposals' });
      }

      const proposalId = req.params.proposalId;
      const { milestones } = req.body;
      const engagement = await EngagementService.acceptProposal(user.userId, proposalId, milestones);

      res.status(200).json({
        success: true,
        message: 'Proposal accepted, escrow funded, engagement contract initiated with milestones',
        data: engagement
      });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customer clients can reject proposals' });
      }

      const proposalId = req.params.proposalId;
      await EngagementService.rejectProposal(user.userId, proposalId);

      res.status(200).json({
        success: true,
        message: 'Proposal rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProposalStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const proposalId = req.params.proposalId;
      const { status, comment } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }

      const updated = await EngagementService.updateProposalStatus(user.userId, proposalId, status, comment);
      res.status(200).json({
        success: true,
        message: `Proposal status updated to ${status.toLowerCase()}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async submitMilestoneWork(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can submit deliverables' });
      }

      const milestoneId = req.params.milestoneId;
      const { deliverableUrl, deliverableNotes } = req.body;
      if (!deliverableUrl) {
        return res.status(400).json({ success: false, message: 'deliverableUrl is required' });
      }

      const milestone = await EngagementService.submitMilestoneWork(user.userId, milestoneId, deliverableUrl, deliverableNotes);
      res.status(200).json({
        success: true,
        message: 'Milestone deliverable submitted successfully',
        data: milestone
      });
    } catch (error) {
      next(error);
    }
  }

  public static async approveMilestoneWork(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customer clients can approve milestone work' });
      }

      const milestoneId = req.params.milestoneId;
      const milestone = await EngagementService.approveMilestoneWork(user.userId, milestoneId);
      res.status(200).json({
        success: true,
        message: 'Milestone work approved successfully',
        data: milestone
      });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectMilestoneWork(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customer clients can reject milestone work' });
      }

      const milestoneId = req.params.milestoneId;
      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ success: false, message: 'rejection notes are required' });
      }

      const milestone = await EngagementService.rejectMilestoneWork(user.userId, milestoneId, notes);
      res.status(200).json({
        success: true,
        message: 'Milestone work rejected successfully',
        data: milestone
      });
    } catch (error) {
      next(error);
    }
  }

  public static async submitWork(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can submit deliverables' });
      }

      const engagementId = req.params.engagementId;
      const engagement = await EngagementService.submitDeliverable(user.userId, engagementId);

      res.status(200).json({
        success: true,
        message: 'Deliverable work submitted successfully',
        data: engagement
      });
    } catch (error) {
      next(error);
    }
  }

  public static async approveRelease(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customer clients can release escrow' });
      }

      const engagementId = req.params.engagementId;
      const engagement = await EngagementService.completeEngagement(user.userId, engagementId);

      res.status(200).json({
        success: true,
        message: 'Engagement marked complete and escrow payout released',
        data: engagement
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProposals(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const list = await EngagementService.getProposals(user.userId, user.role);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  public static async getEngagements(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const list = await EngagementService.getEngagements(user.userId, user.role);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }
}
