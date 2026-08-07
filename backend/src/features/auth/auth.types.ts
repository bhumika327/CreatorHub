import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
