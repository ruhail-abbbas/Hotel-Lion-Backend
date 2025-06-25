import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    password_hash: '$2b$10$hashedPassword',
    role: UserRole.admin,
    phone: null,
    created_at: new Date(),
    updated_at: new Date(),
    hotel_users: [],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: {
          hotel_users: {
            include: {
              hotel: true,
            },
          },
        },
      });
    });

    it('should return null when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should return auth response with tokens', async () => {
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.signIn(mockUser);

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          phone: undefined,
          role: mockUser.role,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
        },
      });
    });
  });

  describe('signOut', () => {
    it('should delete all refresh tokens for user', async () => {
      const userId = 'user-id';

      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({});

      await service.signOut(userId);

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when found', async () => {
      const userId = 'user-id';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        phone: undefined,
        role: mockUser.role,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const userId = 'nonexistent-id';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
