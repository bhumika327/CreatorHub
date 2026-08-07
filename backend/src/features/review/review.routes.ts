import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/review:
 *   get:
 *     summary: View reviews
 *     tags: [Review]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Review endpoint placeholder" });
});

export default router;
