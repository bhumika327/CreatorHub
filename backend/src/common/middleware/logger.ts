import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../utils/auditLogger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[HTTP Request] ${req.method} ${req.url} - ${new Date().toISOString()}`);

  // Capture response finish to log the status code
  res.on('finish', () => {
    // Only log state-changing API modifications (POST, PUT, DELETE), excluding notification actions
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.url.startsWith('/api/notifications')) {
      const user = (req as any).user;
      const auditRecord = {
        method: req.method,
        url: req.url,
        ip: req.ip || req.socket.remoteAddress,
        statusCode: res.statusCode,
        userId: user ? user.id : 'anonymous',
        role: user ? user.role : 'anonymous'
      };

      // Run asynchronously without blocking the response cycle
      logAudit('api_calls.json', auditRecord).catch((err) => {
        console.error('[RequestLogger] Audit logging error:', err);
      });
    }
  });

  next();
};
