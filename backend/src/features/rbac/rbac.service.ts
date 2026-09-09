import { prisma } from '../../prisma/client';
import { UserRole } from '@prisma/client';
import { UpdateRolePermissionInput, UpdateUserOverrideInput } from './rbac.dto';

export class RbacService {
  public static async getRolePermissions() {
    const list = await prisma.authRolePermission.findMany();
    // Group permissions by role
    const roles: Record<UserRole, string[]> = {
      CUSTOMER: [],
      CREATOR: [],
      MANAGER: []
    };

    list.forEach((item) => {
      roles[item.role].push(item.permissionName);
    });

    return roles;
  }

  public static async updateRolePermission(input: UpdateRolePermissionInput) {
    const { role, permissionName, active } = input;

    if (active) {
      // Create/Upsert mapping
      await prisma.authRolePermission.upsert({
        where: {
          role_permissionName: {
            role,
            permissionName
          }
        },
        update: {},
        create: {
          role,
          permissionName
        }
      });
    } else {
      // Delete mapping if exists
      try {
        await prisma.authRolePermission.delete({
          where: {
            role_permissionName: {
              role,
              permissionName
            }
          }
        });
      } catch (e) {
        // Suppress error if mapping already didn't exist
      }
    }

    return { role, permissionName, active };
  }

  public static async updateUserOverride(input: UpdateUserOverrideInput) {
    const { userId, permissionName, allowed, active } = input;

    // Verify user exists first
    const user = await prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    if (active) {
      // Upsert override
      await prisma.authUserPermissionOverride.upsert({
        where: {
          userId_permissionName: {
            userId,
            permissionName
          }
        },
        update: { allowed },
        create: { userId, permissionName, allowed }
      });
    } else {
      // Delete override to fall back to role default
      try {
        await prisma.authUserPermissionOverride.delete({
          where: {
            userId_permissionName: {
              userId,
              permissionName
            }
          }
        });
      } catch (e) {
        // Suppress error if override didn't exist
      }
    }

    return { userId, permissionName, allowed, active };
  }

  public static async getUserPermissions(userId: string) {
    const user = await prisma.authUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    // 1. Get role-based permissions
    const rolePermissions = await prisma.authRolePermission.findMany({
      where: { role: user.role }
    });
    const permissions = new Set(rolePermissions.map((rp) => rp.permissionName));

    // 2. Apply user-specific overrides
    const overrides = await prisma.authUserPermissionOverride.findMany({
      where: { userId }
    });

    overrides.forEach((override) => {
      if (override.allowed) {
        permissions.add(override.permissionName);
      } else {
        permissions.delete(override.permissionName);
      }
    });

    return Array.from(permissions);
  }

  public static async hasPermission(userId: string, role: UserRole, permissionName: string): Promise<boolean> {
    if (role === UserRole.MANAGER) {
      const override = await prisma.authUserPermissionOverride.findUnique({
        where: {
          userId_permissionName: {
            userId,
            permissionName
          }
        }
      });
      if (override && !override.allowed) {
        return false;
      }
      return true;
    }

    // 1. Check user override
    const override = await prisma.authUserPermissionOverride.findUnique({
      where: {
        userId_permissionName: {
          userId,
          permissionName
        }
      }
    });

    if (override) {
      return override.allowed;
    }

    // 2. Check role permission
    const rolePermission = await prisma.authRolePermission.findUnique({
      where: {
        role_permissionName: {
          role,
          permissionName
        }
      }
    });

    return !!rolePermission;
  }

  public static async ensurePermissions() {
    const permissionsToEnsure = [
      { role: UserRole.CUSTOMER, permissionName: 'notification:view' },
      { role: UserRole.CUSTOMER, permissionName: 'notification:update' },
      { role: UserRole.CUSTOMER, permissionName: 'chat:view' },
      { role: UserRole.CUSTOMER, permissionName: 'chat:send' },
      { role: UserRole.CUSTOMER, permissionName: 'payment:fund' },
      { role: UserRole.CUSTOMER, permissionName: 'payment:release' },
      { role: UserRole.CUSTOMER, permissionName: 'payment:refund' },
      { role: UserRole.CUSTOMER, permissionName: 'payment:view' },
      { role: UserRole.CREATOR, permissionName: 'notification:view' },
      { role: UserRole.CREATOR, permissionName: 'notification:update' },
      { role: UserRole.CREATOR, permissionName: 'chat:view' },
      { role: UserRole.CREATOR, permissionName: 'chat:send' },
      { role: UserRole.CREATOR, permissionName: 'payment:view' },
      { role: UserRole.MANAGER, permissionName: 'notification:view' },
      { role: UserRole.MANAGER, permissionName: 'notification:update' },
      { role: UserRole.MANAGER, permissionName: 'chat:view' },
      { role: UserRole.MANAGER, permissionName: 'chat:send' },
      { role: UserRole.MANAGER, permissionName: 'payment:refund' },
      { role: UserRole.MANAGER, permissionName: 'payment:view' }
    ];

    for (const item of permissionsToEnsure) {
      await prisma.authRolePermission.upsert({
        where: {
          role_permissionName: {
            role: item.role,
            permissionName: item.permissionName
          }
        },
        update: {},
        create: {
          role: item.role,
          permissionName: item.permissionName
        }
      });
    }
  }
}
