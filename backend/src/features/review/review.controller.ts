import { Request, Response, NextFunction } from 'express';
import { CreateReviewSchema } from './review.dto';
import { ReviewService } from './review.service';

export class ReviewController {
  public static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parseResult = CreateReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const review = await ReviewService.createReview(user.userId, parseResult.data);

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = req.params.targetId;
      const list = await ReviewService.getReviews(targetId);

      res.status(200).json({
        success: true,
        data: list
      });
    } catch (error) {
      next(error);
    }
  }
}
