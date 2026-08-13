import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../common/config/env';
import { TokenPayload } from './auth.types';
import { prisma } from '../../prisma/client';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    
    // Validate user existence and status in database
    const user = await prisma.authUser.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Authenticated user not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: `Access denied: Account status is ${user.status.toLowerCase()}` });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired access token' });
  }
};
