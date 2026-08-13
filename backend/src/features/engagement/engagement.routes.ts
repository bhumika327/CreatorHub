import { Router } from 'express';
import { EngagementController } from './engagement.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/engagement/proposals:
 *   get:
 *     summary: Fetch all proposals for the authenticated user
 *     tags: [Engagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved proposals list
 */
router.get('/proposals', authenticateToken, EngagementController.getProposals);

/**
 * @openapi
 * /api/engagement/contracts:
 *   get:
 *     summary: Fetch active hiring contracts (Engagements)
 *     tags: [Engagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved contracts list
 */
router.get('/contracts', authenticateToken, EngagementController.getEngagements);

/**
 * @openapi
 * /api/engagement/bid/{requirementId}:
 *   post:
 *     summary: Submit a proposal bid to a requirement (Creators only)
 *     tags: [Engagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requirementId
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
 *               - coverLetter
 *               - bidAmount
 *               - deliveryDays
 *             properties:
 *               coverLetter:
 *                 type: string
 *                 example: I can design professional TikTok edits for your channel.
 *               bidAmount:
 *                 type: number
 *                 example: 250.00
 *               deliveryDays:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Proposal bid registered
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden (Not a Creator)
 */
router.post('/bid/:requirementId', authenticateToken, EngagementController.submitProposal);

/**
 * @openapi
 * /api/engagement/accept/{proposalId}:
 *   post:
 *     summary: Accept proposal, fund escrow, and lock contract (Customers only)
 *     tags: [Engagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal accepted and escrow held
 *       403:
 *         description: Forbidden
 */
router.post('/accept/:proposalId', authenticateToken, EngagementController.acceptProposal);

/**
 * @openapi
 * /api/engagement/reject/{proposalId}:
 *   post:
 *     summary: Reject proposal (Customers only)
 *     tags: [Engagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal rejected
 *       403:
 *         description: Forbidden
 */
router.post('/reject/:proposalId', authenticateToken, EngagementController.rejectProposal);

/**
 * @openapi
 * /api/engagement/submit-work/{engagementId}:
 *   post:
 *     summary: Submit work deliverable (Creators only)
 *     tags: [Engagement]
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
 *         description: Deliverable work submitted
 *       403:
 *         description: Forbidden
 */
router.post('/submit-work/:engagementId', authenticateToken, EngagementController.submitWork);

/**
 * @openapi
 * /api/engagement/release/{engagementId}:
 *   post:
 *     summary: Accept deliverable and release escrow payout to creator (Customers only)
 *     tags: [Engagement]
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
 *         description: Escrow payout released
 *       403:
 *         description: Forbidden
 */
router.post('/release/:engagementId', authenticateToken, EngagementController.approveRelease);

// Proposal Status & History updates (withdraw/view/shortlist)
router.post('/proposals/:proposalId/status', authenticateToken, EngagementController.updateProposalStatus);

// Engagement Milestones deliverables management
router.post('/milestones/:milestoneId/submit', authenticateToken, EngagementController.submitMilestoneWork);
router.post('/milestones/:milestoneId/approve', authenticateToken, EngagementController.approveMilestoneWork);
router.post('/milestones/:milestoneId/reject', authenticateToken, EngagementController.rejectMilestoneWork);

export default router;
export { router };
