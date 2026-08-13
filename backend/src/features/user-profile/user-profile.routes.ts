import { Router } from 'express';
import { UserProfileController } from './user-profile.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requirePermission } from '../rbac/rbac.middleware';

const router = Router();

/**
 * @openapi
 * /api/user-profile:
 *   get:
 *     summary: Get profile of the logged-in user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, UserProfileController.getProfile);

/**
 * @openapi
 * /api/user-profile:
 *   put:
 *     summary: Update profile of the logged-in user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Alice Updated
 *               companyName:
 *                 type: string
 *                 example: Alice Tech LLC
 *               displayName:
 *                 type: string
 *                 example: Bob Designer
 *               bio:
 *                 type: string
 *                 example: Premium UX specialist
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Figma", "React"]
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/', authenticateToken, UserProfileController.updateProfile);

/**
 * @openapi
 * /api/user-profile/services:
 *   post:
 *     summary: Add service package (Creators only)
 *     tags: [Profile]
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
 *               - price
 *               - deliveryDays
 *             properties:
 *               title:
 *                 type: string
 *                 example: Logo Design Package
 *               description:
 *                 type: string
 *                 example: Custom vector logo design with 3 revisions.
 *               price:
 *                 type: number
 *                 example: 150.00
 *               deliveryDays:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Service package created
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden (Not a Creator)
 */
router.post('/services', authenticateToken, UserProfileController.addService);

/**
 * @openapi
 * /api/user-profile/services/{serviceId}:
 *   delete:
 *     summary: Delete service package (Creators only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service package ID
 *     responses:
 *       200:
 *         description: Service package deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service not found
 */
router.delete('/services/:serviceId', authenticateToken, UserProfileController.deleteService);

/**
 * @openapi
 * /api/user-profile/availability:
 *   put:
 *     summary: Update availability calendar (Creators only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - date
 *                 - isAvailable
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-08-15T00:00:00.000Z
 *                 isAvailable:
 *                   type: boolean
 *                   example: true
 *     responses:
 *       200:
 *         description: Availability calendar synchronized
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.put('/availability', authenticateToken, UserProfileController.setAvailability);

/**
 * @openapi
 * /api/user-profile/ai-suggestions:
 *   get:
 *     summary: Retrieve Gemini AI suggestions to improve Creator profile bio and tags (Creators only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched AI optimization copy
 *       403:
 *         description: Forbidden
 */
router.get('/ai-suggestions', authenticateToken, requirePermission('ai:suggest'), UserProfileController.getAiSuggestions);

// Business Verification
router.post('/business-verification', authenticateToken, UserProfileController.submitBusinessVerification);
router.get('/business-verification', authenticateToken, UserProfileController.getBusinessVerification);

// Creator Bookmarks
router.post('/bookmarks/:creatorId', authenticateToken, UserProfileController.addBookmark);
router.delete('/bookmarks/:creatorId', authenticateToken, UserProfileController.deleteBookmark);
router.get('/bookmarks', authenticateToken, UserProfileController.getBookmarks);

// Creator Portfolio Items
router.post('/portfolio', authenticateToken, UserProfileController.addPortfolioItem);
router.put('/portfolio/:itemId', authenticateToken, UserProfileController.updatePortfolioItem);
router.delete('/portfolio/:itemId', authenticateToken, UserProfileController.deletePortfolioItem);
router.get('/portfolio', authenticateToken, UserProfileController.getPortfolioItems);

// Creator Service Packages
router.post('/services/:serviceId/packages', authenticateToken, UserProfileController.setServicePackages);
router.get('/services/:serviceId/packages', UserProfileController.getServicePackages);

export default router;
export { router };
