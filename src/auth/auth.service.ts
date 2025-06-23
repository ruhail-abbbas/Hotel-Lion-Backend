import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        hotel_users: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      return user;
    }
    return null;
  }

  async signIn(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.generateRefreshToken(user.id);

    const userResponse: UserResponseDto = {
      id: user.id,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return {
      access_token,
      refresh_token,
      user: userResponse,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Rotate refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    const new_refresh_token = await this.generateRefreshToken(
      tokenRecord.user.id,
    );

    return {
      access_token,
      refresh_token: new_refresh_token,
    } as { access_token: string; refresh_token: string };
  }

  async signOut(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        hotel_users: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token,
        user_id: userId,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });
  }
}
