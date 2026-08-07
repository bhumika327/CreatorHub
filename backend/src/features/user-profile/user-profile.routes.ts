import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/user-profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Profile endpoint placeholder" });
});

export default router;
