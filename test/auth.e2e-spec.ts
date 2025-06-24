import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testUser: any;
  let testHotel: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test hotel
    testHotel = await prismaService.hotel.create({
      data: {
        name: 'Test Hotel',
        location: 'Test Location',
      },
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: UserRole.admin,
      },
    });

    // Associate user with hotel
    await prismaService.hotelUsersPivot.create({
      data: {
        user_id: testUser.id,
        hotel_id: testHotel.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.refreshToken.deleteMany({});
    await prismaService.hotelUsersPivot.deleteMany({});
    await prismaService.user.deleteMany({});
    await prismaService.hotel.deleteMany({});

    await app.close();
  });

  describe('/auth/sign-in (POST)', () => {
    it('should sign in with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('test@example.com');
          expect(res.body.user.role).toBe('admin');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const signInResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = signInResponse.body.access_token;
    });

    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('test@example.com');
          expect(res.body.role).toBe('admin');
          expect(res.body).not.toHaveProperty('password_hash');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/sign-out (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const signInResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = signInResponse.body.access_token;
    });

    it('should sign out successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Signed out successfully');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sign-out')
        .expect(401);
    });
  });
});
