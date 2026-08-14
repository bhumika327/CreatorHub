import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requirePermission } from '../rbac/rbac.middleware';

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Retrieve notifications history for user
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *         description: Limit of notifications per page
 *     responses:
 *       200:
 *         description: Notifications list retrieved
 */
router.get('/', authenticateToken, requirePermission('notification:view'), NotificationController.listNotifications);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get user unread notification count
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count retrieved
 */
router.get('/unread-count', authenticateToken, requirePermission('notification:view'), NotificationController.getUnreadCount);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:id/read', authenticateToken, requirePermission('notification:update'), NotificationController.markRead);

/**
 * @openapi
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all user notifications as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.post('/read-all', authenticateToken, requirePermission('notification:update'), NotificationController.markAllRead);

export default router;
export { router };
