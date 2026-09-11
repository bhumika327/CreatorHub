import { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from './auth.dto';
import { AuthService } from './auth.service';
import { logAudit } from '../../common/utils/auditLogger';
import { prisma } from '../../prisma/client';

const getRefreshTokenFromCookie = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'refreshToken') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

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

      const isProduction = process.env.NODE_ENV === 'production';

      // Set refresh token in httpOnly secure cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
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
      const isProduction = process.env.NODE_ENV === 'production';
      const refreshToken = req.body?.refreshToken || getRefreshTokenFromCookie(req);
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token cookie or body required' });
      }

      const result = await AuthService.refreshTokens(refreshToken);

      // Set new rotated refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const userId = req.user?.userId;
      if (userId) {
        await AuthService.logout(userId);
      }

      // Clear the refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const user = await prisma.authUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          customerProfile: true,
          creatorProfile: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
