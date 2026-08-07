import { Request, Response, NextFunction } from 'express';
import { UpdateRolePermissionSchema, UpdateUserOverrideSchema } from './rbac.dto';
import { RbacService } from './rbac.service';

export class RbacController {
  public static async getRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RbacService.getRolePermissions();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async updateRolePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = UpdateRolePermissionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const result = await RbacService.updateRolePermission(parseResult.data);
      res.status(200).json({
        success: true,
        message: 'Role permissions updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = UpdateUserOverrideSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const result = await RbacService.updateUserOverride(parseResult.data);
      res.status(200).json({
        success: true,
        message: 'User permission override updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUserPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.userId;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check ownership or if user is a MANAGER
      if (user.role !== 'MANAGER' && user.userId !== targetUserId) {
        return res.status(403).json({ success: false, message: 'Permission denied: cannot fetch other user permissions' });
      }

      const data = await RbacService.getUserPermissions(targetUserId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
