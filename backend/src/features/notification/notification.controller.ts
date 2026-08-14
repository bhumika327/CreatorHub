import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { GetNotificationsQuerySchema } from './notification.dto';

export class NotificationController {
  public static async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parseResult = GetNotificationsQuerySchema.safeParse(req.query);
      const query = parseResult.success ? parseResult.data : {};

      const page = query.page || 1;
      const limit = query.limit || 20;

      const result = await NotificationService.getUserNotifications(user.userId, page, limit);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const count = await NotificationService.getUnreadCount(user.userId);

      res.status(200).json({
        success: true,
        data: count
      });
    } catch (error) {
      next(error);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const updated = await NotificationService.markAsRead(user.userId, id);

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      await NotificationService.markAllAsRead(user.userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      next(error);
    }
  }
}
