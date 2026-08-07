import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../prisma/client';
import { UserRole } from '@prisma/client';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied: insufficient role privileges' });
    }

    next();
  };
};

export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Managers have override access to all capabilities except if explicitly blocked
    if (user.role === UserRole.MANAGER) {
      // Still check if there is an explicit revoke override for this manager
      const override = await prisma.authUserPermissionOverride.findUnique({
        where: {
          userId_permissionName: {
            userId: user.userId,
            permissionName
          }
        }
      });
      if (override && !override.allowed) {
        return res.status(403).json({ success: false, message: 'Permission revoked by custom override' });
      }
      return next();
    }

    try {
      // 1. Check individual user override first (can grant or revoke)
      const override = await prisma.authUserPermissionOverride.findUnique({
        where: {
          userId_permissionName: {
            userId: user.userId,
            permissionName
          }
        }
      });

      if (override) {
        if (override.allowed) {
          return next();
        } else {
          return res.status(403).json({ success: false, message: 'Permission denied: revoked by custom user override' });
        }
      }

      // 2. Check role permission mapping in DB
      const rolePermission = await prisma.authRolePermission.findUnique({
        where: {
          role_permissionName: {
            role: user.role,
            permissionName
          }
        }
      });

      if (rolePermission) {
        return next();
      }

      return res.status(403).json({ success: false, message: `Permission denied: missing required permission '${permissionName}'` });
    } catch (error) {
      next(error);
    }
  };
};
