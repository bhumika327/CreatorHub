import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/catalog:
 *   get:
 *     summary: View services or requirements
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({ success: true, message: "Catalog endpoint placeholder" });
});

export default router;
