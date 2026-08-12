import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/admin/dispute/raise/{engagementId}:
 *   post:
 *     summary: File a dispute on a contract (Contract members only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: engagementId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Hired creator did not deliver the video matching specs.
 *     responses:
 *       201:
 *         description: Dispute raised
 *       403:
 *         description: Forbidden
 */
router.post('/dispute/raise/:engagementId', authenticateToken, AdminController.raiseDispute);

/**
 * @openapi
 * /api/admin/dispute/resolve/{disputeId}:
 *   post:
 *     summary: Resolve dispute and split/release funds (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
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
 *               - resolutionNotes
 *               - action
 *             properties:
 *               resolutionNotes:
 *                 type: string
 *                 example: Creator did not meet instructions. Refunding client.
 *               action:
 *                 type: string
 *                 enum: [REFUND, RELEASE]
 *                 example: REFUND
 *     responses:
 *       200:
 *         description: Dispute resolved and ledger updated
 *       403:
 *         description: Forbidden
 */
router.post('/dispute/resolve/:disputeId', authenticateToken, AdminController.resolveDispute);

/**
 * @openapi
 * /api/admin/creator/approve/{creatorId}:
 *   post:
 *     summary: Approve a content creator profile to list in catalog (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: creatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Creator profile approved
 *       403:
 *         description: Forbidden
 */
router.post('/creator/approve/:creatorId', authenticateToken, AdminController.approveCreator);

/**
 * @openapi
 * /api/admin/disputes:
 *   get:
 *     summary: Retrieve disputes list queue (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retrieved disputes queue
 *       403:
 *         description: Forbidden
 */
router.get('/disputes', authenticateToken, AdminController.getDisputes);

/**
 * @openapi
 * /api/admin/verification-queue:
 *   get:
 *     summary: Retrieve pending creator approval list queue (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retrieved pending verification queue
 *       403:
 *         description: Forbidden
 */
router.get('/verification-queue', authenticateToken, AdminController.getVerificationQueue);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: Retrieve list of all registered users (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 *       403:
 *         description: Forbidden
 */
router.get('/users', authenticateToken, AdminController.getUsers);

/**
 * @openapi
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Assign or update a user's system role (Managers only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, CREATOR, MANAGER]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       403:
 *         description: Forbidden
 */
router.put('/users/:userId/role', authenticateToken, AdminController.updateUserRole);

export default router;
export { router };
