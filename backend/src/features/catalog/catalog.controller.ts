import { Request, Response, NextFunction } from 'express';
import { PostRequirementSchema, BrowseQuerySchema } from './catalog.dto';
import { CatalogService } from './catalog.service';
import { MediaService } from '../media/media.service';

export class CatalogController {
  public static async postRequirement(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can post requirements' });
      }

      const parseResult = PostRequirementSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requirement = await CatalogService.postRequirement(user.userId, parseResult.data, ip);

      res.status(201).json({
        success: true,
        message: 'Requirement posted successfully',
        data: requirement
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRequirements(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = BrowseQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const list = await CatalogService.getRequirements(parseResult.data);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  public static async getCreators(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = BrowseQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const list = await CatalogService.getCreators(parseResult.data);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  public static async uploadMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const base64Data = req.body?.image;
      if (!base64Data) {
        return res.status(400).json({ success: false, message: 'Base64 image payload is required in body' });
      }

      const url = await MediaService.uploadImage(base64Data);
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully to Cloudinary',
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
}
