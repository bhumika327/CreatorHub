import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requirePermission } from '../rbac/rbac.middleware';

const router = Router();

/**
 * @openapi
 * /api/chat/rooms:
 *   get:
 *     summary: Retrieve active chat rooms for user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active rooms list retrieved
 */
router.get('/rooms', authenticateToken, requirePermission('chat:read'), ChatController.getRooms);

/**
 * @openapi
 * /api/chat/room/{roomId}/message:
 *   post:
 *     summary: Send message to a chat room
 *     description: Sanitizes phone number and email leaks to keep transaction on-platform.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello, please send details to my email test@example.com
 *     responses:
 *       201:
 *         description: Message sent (sanitized)
 */
router.post('/room/:roomId/message', authenticateToken, requirePermission('chat:send'), ChatController.sendMessage);

/**
 * @openapi
 * /api/chat/room/{roomId}/messages:
 *   get:
 *     summary: Retrieve messages from a room (HTTP polling endpoint)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lastMessageId
 *         schema:
 *           type: string
 *         description: Optional ID of the last fetched message to get newer messages only
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/room/:roomId/messages', authenticateToken, requirePermission('chat:read'), ChatController.getMessages);

export default router;
export { router };
