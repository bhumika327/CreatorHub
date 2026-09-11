import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

// Import features
import authRoutes from './features/auth/auth.routes';
import rbacRoutes from './features/rbac/rbac.routes';
import userProfileRoutes from './features/user-profile/user-profile.routes';
import catalogRoutes from './features/catalog/catalog.routes';
import engagementRoutes from './features/engagement/engagement.routes';
import chatRoutes from './features/chat/chat.routes';
import paymentRoutes from './features/payment/payment.routes';
import reviewRoutes from './features/review/review.routes';
import adminRoutes from './features/admin/admin.routes';
import notificationRoutes from './features/notification/notification.routes';

// Import common middlewares
import { requestLogger } from './common/middleware/logger';
import { errorHandler } from './common/middleware/errorHandler';

dotenv.config();

const app = express();

const allowedOrigins: (string | RegExp)[] = [
  'https://creator-hub-bice-nine.vercel.app',
  'http://localhost:5173',
  /^https:\/\/creator-hub-.*-bhumika327s-projects\.vercel\.app$/,
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed && trimmed !== '*' && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Swagger Documentation Configuration
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CreatorHub API Documentation',
      version: '1.0.0',
      description: 'API endpoints for the CreatorHub platform',
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/features/**/*.ts', './src/features/**/*.js'], // Path to APIs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route redirection or welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CreatorHub backend API. Go to /api-docs for documentation.',
  });
});

// Fallback Route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Error handling middleware
app.use(errorHandler);

export default app;
export { app };
