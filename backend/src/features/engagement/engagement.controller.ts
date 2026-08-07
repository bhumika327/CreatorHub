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
      const engagement = await EngagementService.acceptProposal(user.userId, proposalId);

      res.status(200).json({
        success: true,
        message: 'Proposal accepted, escrow funded, engagement contract initiated',
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
