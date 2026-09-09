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
      const { resolutionNotes, resolution, action } = req.body;
      const notes = resolutionNotes || resolution;

      if (!notes || !action || !['REFUND', 'RELEASE'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "resolutionNotes and action ('REFUND' or 'RELEASE') are required"
        });
      }

      const dispute = await AdminService.resolveDispute(disputeId, notes, action as 'REFUND' | 'RELEASE');

      res.status(200).json({
        success: true,
        message: `Dispute resolved successfully with action ${action}`,
        data: dispute
      });
    } catch (error) {
      next(error);
    }
  }

  public static async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can suspend users' });
      }

      const userId = req.params.userId;
      const { status } = req.body;
      if (!status || !['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Valid status (ACTIVE, SUSPENDED, or DEACTIVATED) is required' });
      }

      const updated = await AdminService.suspendUser(userId, status);
      res.status(200).json({
        success: true,
        message: `User status updated to ${status} successfully`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reviewCreator(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can verify creator profiles' });
      }

      const creatorId = req.params.creatorId;
      const { action, rejectionReason } = req.body;
      if (!action || !['APPROVE', 'REJECT', 'SUSPEND', 'UNDER_REVIEW'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Valid action (APPROVE, REJECT, SUSPEND, or UNDER_REVIEW) is required' });
      }

      const updated = await AdminService.reviewCreator(creatorId, action, user.userId, rejectionReason);
      res.status(200).json({
        success: true,
        message: `Creator profile status updated successfully via action ${action}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reviewBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can verify customer businesses' });
      }

      const customerId = req.params.customerId;
      const { action, rejectionReason } = req.body;
      if (!action || !['APPROVE', 'REJECT', 'SUSPEND', 'UNDER_REVIEW'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Valid action (APPROVE, REJECT, SUSPEND, or UNDER_REVIEW) is required' });
      }

      const updated = await AdminService.reviewBusiness(customerId, action, user.userId, rejectionReason);
      res.status(200).json({
        success: true,
        message: `Customer business status updated successfully via action ${action}`,
        data: updated
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
      const profile = await AdminService.reviewCreator(creatorId, 'APPROVE', user.userId);

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

  public static async getBusinessVerificationQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can view business verification queue' });
      }

      const data = await AdminService.getBusinessVerificationQueue();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can view users' });
      }

      const data = await AdminService.getUsers();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Only managers can change user roles' });
      }

      const userId = req.params.userId;
      const { role } = req.body;
      if (!role || !['CUSTOMER', 'CREATOR', 'MANAGER'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Valid role (CUSTOMER, CREATOR, or MANAGER) is required' });
      }

      const updated = await AdminService.updateUserRole(userId, role);
      res.status(200).json({ success: true, message: 'User role updated successfully', data: updated });
    } catch (error) {
      next(error);
    }
  }
}
