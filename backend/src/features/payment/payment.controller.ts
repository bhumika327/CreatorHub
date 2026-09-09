import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { UserRole } from '@prisma/client';

export class PaymentController {
  public static async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const list = await PaymentService.getLedger(user.userId);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  public static async fundMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.CUSTOMER) {
        return res.status(403).json({ success: false, message: 'Only Customer clients can fund milestones' });
      }

      const { milestoneId } = req.params;
      if (!milestoneId) {
        return res.status(400).json({ success: false, message: 'milestoneId is required' });
      }

      const ledgerEntry = await PaymentService.fundMilestone(milestoneId, user.userId);
      res.status(200).json({
        success: true,
        message: 'Milestone payment successfully funded and held in escrow',
        data: ledgerEntry
      });
    } catch (error) {
      next(error);
    }
  }

  public static async releaseMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.CUSTOMER) {
        return res.status(403).json({ success: false, message: 'Only Customer clients can release milestone payments' });
      }

      const { milestoneId } = req.params;
      if (!milestoneId) {
        return res.status(400).json({ success: false, message: 'milestoneId is required' });
      }

      const ledgerEntry = await PaymentService.releaseMilestone(milestoneId, user.userId);
      res.status(200).json({
        success: true,
        message: 'Milestone payment successfully released to creator',
        data: ledgerEntry
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refundTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { transactionId } = req.params;
      if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId is required' });
      }

      const ledgerEntry = await PaymentService.refundTransaction(transactionId, user.userId, user.role);
      res.status(200).json({
        success: true,
        message: 'Transaction successfully refunded',
        data: ledgerEntry
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getEngagementPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { engagementId } = req.params;
      if (!engagementId) {
        return res.status(400).json({ success: false, message: 'engagementId is required' });
      }

      const list = await PaymentService.getEngagementPaymentHistory(engagementId, user.userId, user.role);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }
}
