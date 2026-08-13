import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from './auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user (CUSTOMER or CREATOR) and creates their profile with silent location fetching.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@creatorhub.com
 *               password:
 *                 type: string
 *                 minimum: 6
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, CREATOR, MANAGER]
 *                 example: CUSTOMER
 *               fullName:
 *                 type: string
 *                 example: Alice Customer
 *               companyName:
 *                 type: string
 *                 example: Alice Tech Corp
 *               displayName:
 *                 type: string
 *                 example: Bob Creator
 *               bio:
 *                 type: string
 *                 example: Professional UI/UX Designer
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Input validation error or email already exists
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates user credentials, logs login attempt to files, and generates Access and Refresh tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@creatorhub.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       400:
 *         description: Input validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Rotates token keys by deleting current refresh token and issuing a brand new set.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Tokens rotated successfully
 *       400:
 *         description: Input validation error
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Revokes all user refresh tokens.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Retrieves the account and profile details of the logged in user.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authenticateToken, AuthController.getMe);

export default router;
export { router };
