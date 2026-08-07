import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';

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
}
