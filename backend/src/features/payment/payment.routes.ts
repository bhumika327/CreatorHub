import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/payment/ledger:
 *   get:
 *     summary: Retrieve transaction ledger history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user transaction list
 *       401:
 *         description: Unauthorized
 */
router.get('/ledger', authenticateToken, PaymentController.getLedger);

export default router;
export { router };
