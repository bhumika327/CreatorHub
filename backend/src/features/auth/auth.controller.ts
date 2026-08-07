import { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.dto';
import { AuthService } from './auth.service';
import { logAudit } from '../../common/utils/auditLogger';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = RegisterSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const user = await AuthService.register(parseResult.data, ip);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const email = req.body?.email || 'unknown';

    try {
      const parseResult = LoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const result = await AuthService.login(parseResult.data);

      // Log success login attempt to file audit log
      await logAudit('login_attempts.json', {
        userId: result.user.id,
        email: result.user.email,
        ip,
        userAgent,
        status: 'SUCCESS'
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      // Log failed login attempt to file audit log
      await logAudit('login_attempts.json', {
        email,
        ip,
        userAgent,
        status: 'FAILED',
        reason: error.message || 'Authentication failed'
      });

      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const parseResult = RefreshSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.error.format() });
      }

      const result = await AuthService.refreshTokens(parseResult.data.refreshToken);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await AuthService.logout(userId);
      }
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
