import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const UpdateRolePermissionSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  permissionName: z.string().min(1, 'Permission name cannot be empty'),
  active: z.boolean({
    required_error: 'Active flag is required'
  })
});

export const UpdateUserOverrideSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  permissionName: z.string().min(1, 'Permission name cannot be empty'),
  allowed: z.boolean({
    required_error: 'Allowed flag is required'
  }),
  active: z.boolean({
    required_error: 'Active flag is required'
  }) // if false, deletes the override, returning to default role permission
});

export type UpdateRolePermissionInput = z.infer<typeof UpdateRolePermissionSchema>;
export type UpdateUserOverrideInput = z.infer<typeof UpdateUserOverrideSchema>;
