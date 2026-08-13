import { Request, Response, NextFunction } from 'express';
import {
  UpdateCustomerProfileSchema,
  UpdateCreatorProfileSchema,
  CreateServiceSchema,
  CreateAvailabilitySchema
} from './user-profile.dto';
import { UserProfileService } from './user-profile.service';
import { AiService } from '../ai/ai.service';
import { z } from 'zod';

export class UserProfileController {
  public static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      let profile;
      if (user.role === 'CUSTOMER') {
        profile = await UserProfileService.getCustomerProfile(user.userId);
      } else if (user.role === 'CREATOR') {
        profile = await UserProfileService.getCreatorProfile(user.userId);
      } else {
        return res.status(400).json({ success: false, message: 'Managers do not have standard profiles' });
      }

      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      let updatedProfile;
      if (user.role === 'CUSTOMER') {
        const parseResult = UpdateCustomerProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({ success: false, errors: parseResult.error.format() });
        }
        updatedProfile = await UserProfileService.updateCustomerProfile(user.userId, parseResult.data);
      } else if (user.role === 'CREATOR') {
        const parseResult = UpdateCreatorProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({ success: false, errors: parseResult.error.format() });
        }
        updatedProfile = await UserProfileService.updateCreatorProfile(user.userId, parseResult.data);
      } else {
        return res.status(400).json({ success: false, message: 'Cannot update manager profile' });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addService(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can add services' });
      }

      const parseResult = CreateServiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const service = await UserProfileService.addCreatorService(user.userId, parseResult.data);

      res.status(201).json({
        success: true,
        message: 'Service added successfully',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteService(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can delete services' });
      }

      const serviceId = req.params.serviceId;
      await UserProfileService.deleteCreatorService(user.userId, serviceId);

      res.status(200).json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async setAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can set availability' });
      }

      const parseResult = z.array(CreateAvailabilitySchema).safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const list = await UserProfileService.setCreatorAvailability(user.userId, parseResult.data);

      res.status(200).json({
        success: true,
        message: 'Availability calendar updated successfully',
        data: list
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAiSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can request AI suggestions' });
      }

      const profile = await UserProfileService.getCreatorProfile(user.userId);
      const suggestions = await AiService.getProfileSuggestions(
        profile.bio || '',
        profile.skills
      );

      res.status(200).json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async submitBusinessVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can submit business verification' });
      }

      const { companyName, registrationNum, documents } = req.body;
      if (!companyName || !registrationNum || !documents) {
        return res.status(400).json({ success: false, message: 'companyName, registrationNum, and documents are required' });
      }

      const verification = await UserProfileService.submitBusinessVerification(user.userId, {
        companyName,
        registrationNum,
        documents
      });

      res.status(201).json({
        success: true,
        message: 'Business verification submitted successfully',
        data: verification
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBusinessVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can view business verification status' });
      }

      const data = await UserProfileService.getBusinessVerification(user.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async addBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can bookmark creators' });
      }

      const creatorId = req.params.creatorId;
      const bookmark = await UserProfileService.addBookmark(user.userId, creatorId);

      res.status(201).json({
        success: true,
        message: 'Creator bookmarked successfully',
        data: bookmark
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can manage bookmarks' });
      }

      const creatorId = req.params.creatorId;
      await UserProfileService.deleteBookmark(user.userId, creatorId);

      res.status(200).json({
        success: true,
        message: 'Bookmark removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Only Customers can view bookmarks' });
      }

      const data = await UserProfileService.getBookmarks(user.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async addPortfolioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can add portfolio items' });
      }

      const item = await UserProfileService.addPortfolioItem(user.userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Portfolio item added successfully',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updatePortfolioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can update portfolio items' });
      }

      const itemId = req.params.itemId;
      const updated = await UserProfileService.updatePortfolioItem(user.userId, itemId, req.body);
      res.status(200).json({
        success: true,
        message: 'Portfolio item updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deletePortfolioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can delete portfolio items' });
      }

      const itemId = req.params.itemId;
      await UserProfileService.deletePortfolioItem(user.userId, itemId);
      res.status(200).json({
        success: true,
        message: 'Portfolio item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPortfolioItems(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can view portfolio' });
      }

      const data = await UserProfileService.getPortfolioItems(user.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async setServicePackages(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CREATOR') {
        return res.status(403).json({ success: false, message: 'Only Creators can set service packages' });
      }

      const serviceId = req.params.serviceId;
      const { packages } = req.body;
      if (!packages || !Array.isArray(packages)) {
        return res.status(400).json({ success: false, message: 'Packages array is required' });
      }

      const list = await UserProfileService.setServicePackages(user.userId, serviceId, packages);
      res.status(200).json({
        success: true,
        message: 'Service packages updated successfully',
        data: list
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getServicePackages(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceId = req.params.serviceId;
      const list = await UserProfileService.getServicePackages(serviceId);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }
}
