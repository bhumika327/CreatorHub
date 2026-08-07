import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/register', (req, res) => {
  res.json({ success: true, message: "Register endpoint placeholder" });
});

export default router;
