import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/payment:
 *   get:
 *     summary: View payment transactions
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Payment endpoint placeholder" });
});

export default router;
