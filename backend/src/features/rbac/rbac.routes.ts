import { Router } from 'express';
import { RbacController } from './rbac.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requireRole } from './rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /api/rbac/permissions:
 *   get:
 *     summary: Retrieve roles to permission mapping matrix
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched permission configurations
 *       401:
 *         description: Unauthorized
 */
router.get('/permissions', authenticateToken, RbacController.getRolePermissions);

/**
 * @openapi
 * /api/rbac/permissions/role:
 *   put:
 *     summary: Update role-based permission mapping
 *     description: Configures whether a specific permission is granted to a role. Requires MANAGER role privileges.
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - permissionName
 *               - active
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, CREATOR, MANAGER]
 *                 example: CREATOR
 *               permissionName:
 *                 type: string
 *                 example: chat:send
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Role mapping updated successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied (not a MANAGER)
 */
router.put('/permissions/role', authenticateToken, requireRole([UserRole.MANAGER]), RbacController.updateRolePermission);

/**
 * @openapi
 * /api/rbac/permissions/override:
 *   put:
 *     summary: Update user-specific permission override
 *     description: Creates or deletes override rules to explicitly allow or deny a capability for a single account. Requires MANAGER role privileges.
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - permissionName
 *               - allowed
 *               - active
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *               permissionName:
 *                 type: string
 *                 example: chat:send
 *               allowed:
 *                 type: boolean
 *                 example: false
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Override configuration updated successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied (not a MANAGER)
 */
router.put('/permissions/override', authenticateToken, requireRole([UserRole.MANAGER]), RbacController.updateUserOverride);

/**
 * @openapi
 * /api/rbac/permissions/user/{userId}:
 *   get:
 *     summary: Get computed permissions list for a user account
 *     description: Retrieves the list of all allowed permissions, applying role configs and user overrides.
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account User ID
 *     responses:
 *       200:
 *         description: Retrieved user permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access forbidden
 */
router.get('/permissions/user/:userId', authenticateToken, RbacController.getUserPermissions);

export default router;
export { router };
