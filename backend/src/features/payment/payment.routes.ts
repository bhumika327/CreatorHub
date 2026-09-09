import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requirePermission } from '../rbac/rbac.middleware';

const router = Router();

/**
 * @openapi
 * /api/payment/ledger:
 *   get:
 *     summary: Retrieve transaction ledger history and balances
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user transaction list and wallet details
 *       401:
 *         description: Unauthorized
 */
router.get('/ledger', authenticateToken, requirePermission('payment:view'), PaymentController.getLedger);

/**
 * @openapi
 * /api/payment/milestones/{milestoneId}/fund:
 *   post:
 *     summary: Fund a specific milestone payment (held in escrow)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone payment successfully funded and locked in escrow
 *       400:
 *         description: Bad request (milestone already funded or not in PENDING state)
 *       403:
 *         description: Forbidden (Only CUSTOMER role can fund, or unauthorized)
 */
router.post('/milestones/:milestoneId/fund', authenticateToken, requirePermission('payment:fund'), PaymentController.fundMilestone);

/**
 * @openapi
 * /api/payment/milestones/{milestoneId}/release:
 *   post:
 *     summary: Approve milestone work and release escrow payout to creator
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escrow funds released to creator available balance
 *       400:
 *         description: Bad request (milestone not funded or already released)
 *       430:
 *         description: Forbidden
 */
router.post('/milestones/:milestoneId/release', authenticateToken, requirePermission('payment:release'), PaymentController.releaseMilestone);

/**
 * @openapi
 * /api/payment/{transactionId}/refund:
 *   post:
 *     summary: Refund a held escrow transaction back to customer
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escrow transaction successfully refunded
 *       400:
 *         description: Bad request (transaction not HELD)
 *       403:
 *         description: Forbidden
 */
router.post('/:transactionId/refund', authenticateToken, requirePermission('payment:refund'), PaymentController.refundTransaction);

/**
 * @openapi
 * /api/payment/engagements/{engagementId}:
 *   get:
 *     summary: Retrieve payment and ledger history for a specific contract engagement
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: engagementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved contract payment history
 *       403:
 *         description: Forbidden
 */
router.get('/engagements/:engagementId', authenticateToken, requirePermission('payment:view'), PaymentController.getEngagementPaymentHistory);

export default router;
export { router };
