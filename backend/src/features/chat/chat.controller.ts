import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service';

export class ChatController {
  public static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, message: 'Message content string is required' });
      }

      const roomId = req.params.roomId;
      const message = await ChatService.sendMessage(user.userId, roomId, content);

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const roomId = req.params.roomId;
      const lastMessageId = req.query.lastMessageId as string | undefined;

      const list = await ChatService.getMessages(user.userId, roomId, lastMessageId);

      res.status(200).json({
        success: true,
        data: list
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const list = await ChatService.getUserRooms(user.userId);

      res.status(200).json({
        success: true,
        data: list
      });
    } catch (error) {
      next(error);
    }
  }
}
