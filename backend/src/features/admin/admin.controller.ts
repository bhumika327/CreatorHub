import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { CreateDisputeSchema } from '../engagement/engagement.dto';

export class AdminController {
  public static async raiseDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parseResult = CreateDisputeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const engagementId = req.params.engagementId;
      const dispute = await AdminService.raiseDispute(user.userId, engagementId, parseResult.data.reason);

      res.status(201).json({
        success: true,
        message: 'Dispute filed successfully, contract status updated to DISPUTED',
        data: dispute
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resolveDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can resolve disputes' });
      }

      const disputeId = req.params.disputeId;
      const { resolutionNotes, action } = req.body;

      if (!resolutionNotes || !action || !['REFUND', 'RELEASE'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "resolutionNotes and action ('REFUND' or 'RELEASE') are required"
        });
      }

      const dispute = await AdminService.resolveDispute(disputeId, resolutionNotes, action as 'REFUND' | 'RELEASE');

      res.status(200).json({
        success: true,
        message: `Dispute resolved successfully with action ${action}`,
        data: dispute
      });
    } catch (error) {
      next(error);
    }
  }

  public static async approveCreator(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can approve creators' });
      }

      const creatorId = req.params.creatorId;
      const profile = await AdminService.approveCreatorProfile(creatorId);

      res.status(200).json({
        success: true,
        message: 'Creator profile approved and listed successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getDisputes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can view disputes list' });
      }

      const data = await AdminService.getDisputes();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async getVerificationQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can view verification queue' });
      }

      const data = await AdminService.getVerificationQueue();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
