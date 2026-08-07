import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/admin:
 *   get:
 *     summary: Admin actions
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Admin endpoint placeholder" });
});

export default router;
