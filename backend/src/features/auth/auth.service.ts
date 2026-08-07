import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/client';
import { env } from '../../common/config/env';
import { RegisterInput, LoginInput } from './auth.dto';
import { LocationService } from '../location/location.service';

export class AuthService {
  private static ACCESS_TOKEN_EXPIRY = '15m';
  private static REFRESH_TOKEN_EXPIRY = '7d';

  public static async register(input: RegisterInput, ip: string) {
    const existingUser = await prisma.authUser.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw { status: 400, message: 'Email address already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Resolve location silently
    const location = await LocationService.resolveLocation(ip);

    // Create user and profile transactionally
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.authUser.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role
        }
      });

      if (input.role === 'CUSTOMER') {
        await tx.profileCustomer.create({
          data: {
            userId: newUser.id,
            fullName: input.fullName || 'New Customer',
            companyName: input.companyName,
            city: location.city,
            country: location.country
          }
        });
      } else if (input.role === 'CREATOR') {
        await tx.profileCreator.create({
          data: {
            userId: newUser.id,
            displayName: input.displayName || 'New Creator',
            bio: input.bio,
            city: location.city,
            country: location.country,
            isApproved: false // manager approval required
          }
        });
      }

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }

  public static async login(input: LoginInput) {
    const user = await prisma.authUser.findUnique({
      where: { email: input.email }
    });

    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      ...tokens
    };
  }

  public static async refreshTokens(refreshToken: string) {
    // 1. Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }

    // 2. Lookup token in database to prevent multi-use/revoked tokens
    const dbToken = await prisma.authRefreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) {
        await prisma.authRefreshToken.delete({ where: { id: dbToken.id } });
      }
      throw { status: 401, message: 'Refresh token expired or revoked' };
    }

    // 3. Delete current token (rotation) and generate a new pair
    await prisma.authRefreshToken.delete({ where: { token: refreshToken } });

    const user = await prisma.authUser.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw { status: 401, message: 'User not found' };
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      ...tokens
    };
  }

  public static async logout(userId: string) {
    await prisma.authRefreshToken.deleteMany({
      where: { userId }
    });
  }

  private static async generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { userId, role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { userId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY as any }
    );

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.authRefreshToken.upsert({
      where: { userId },
      update: { token: refreshToken, expiresAt },
      create: { userId, token: refreshToken, expiresAt }
    });

    return { accessToken, refreshToken };
  }
}
