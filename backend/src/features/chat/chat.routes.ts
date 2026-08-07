import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/chat:
 *   get:
 *     summary: View chat message logs
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Chat endpoint placeholder" });
});

export default router;
