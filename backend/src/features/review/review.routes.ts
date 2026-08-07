import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/review:
 *   post:
 *     summary: Submit a review and rating for another user
 *     description: Only permitted after a successful engagement contract completion.
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *               - rating
 *               - comment
 *             properties:
 *               targetId:
 *                 type: string
 *                 format: uuid
 *                 example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Excellent editor, delivered videos ahead of schedule!
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Invalid payload or no completed engagement contract found
 */
router.post('/', authenticateToken, ReviewController.createReview);

/**
 * @openapi
 * /api/review/target/{targetId}:
 *   get:
 *     summary: Retrieve reviews received by a user account
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/target/:targetId', ReviewController.getReviews);

export default router;
export { router };
