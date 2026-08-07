import { Request, Response, NextFunction } from 'express';
import {
  UpdateCustomerProfileSchema,
  UpdateCreatorProfileSchema,
  CreateServiceSchema,
  CreateAvailabilitySchema
} from './user-profile.dto';
import { UserProfileService } from './user-profile.service';
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
}
