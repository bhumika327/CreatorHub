import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/rbac/permissions:
 *   get:
 *     summary: Get all roles and permissions
 *     tags: [RBAC]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/permissions', (req, res) => {
  res.json({ success: true, message: "RBAC permissions placeholder" });
});

export default router;
