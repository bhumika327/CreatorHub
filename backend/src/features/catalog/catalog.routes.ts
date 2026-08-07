import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/catalog/requirement:
 *   post:
 *     summary: Post a customer requirement (Customers only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: Need TikTok Video Editor
 *               description:
 *                 type: string
 *                 example: Looking for a creator to edit 5 short-form TikTok videos per week.
 *               budget:
 *                 type: number
 *                 example: 300.00
 *               category:
 *                 type: string
 *                 example: Video Editing
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["TikTok", "Shorts"]
 *     responses:
 *       201:
 *         description: Requirement posted
 *       403:
 *         description: Forbidden (Not a Customer)
 */
router.post('/requirement', authenticateToken, CatalogController.postRequirement);

/**
 * @openapi
 * /api/catalog/requirements:
 *   get:
 *     summary: Browse customer requirements
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Requirements list
 */
router.get('/requirements', CatalogController.getRequirements);

/**
 * @openapi
 * /api/catalog/creators:
 *   get:
 *     summary: Browse approved creators
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma separated list of skills (e.g. Figma,React)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Approved creators list
 */
router.get('/creators', CatalogController.getCreators);

/**
 * @openapi
 * /api/catalog/upload:
 *   post:
 *     summary: Upload file to Cloudinary (authenticated users only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 image payload data URL string
 *                 example: data:image/png;base64,iVBORw0KGgoAAAANS...
 *     responses:
 *       200:
 *         description: Upload success
 *       400:
 *         description: Bad request
 */
router.post('/upload', authenticateToken, CatalogController.uploadMedia);

export default router;
export { router };
