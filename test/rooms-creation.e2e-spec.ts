/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

describe('Room Creation with Image Upload (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
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

    // Create test admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prismaService.user.create({
      data: {
        email: 'test-rooms@example.com',
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

    // Get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'test-rooms@example.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.roomPhoto.deleteMany({
      where: {
        room: {
          hotel_id: testHotel.id,
        },
      },
    });

    await prismaService.room.deleteMany({
      where: {
        hotel_id: testHotel.id,
      },
    });

    await prismaService.hotelUsersPivot.deleteMany({
      where: {
        hotel_id: testHotel.id,
      },
    });

    await prismaService.hotel.delete({
      where: { id: testHotel.id },
    });

    await prismaService.user.delete({
      where: { id: testUser.id },
    });

    await app.close();
  });

  beforeEach(async () => {
    // Clean up any rooms created during tests
    await prismaService.roomPhoto.deleteMany({
      where: {
        room: {
          hotel_id: testHotel.id,
        },
      },
    });

    await prismaService.room.deleteMany({
      where: {
        hotel_id: testHotel.id,
      },
    });
  });

  describe('POST /api/v1/rooms', () => {
    const validRoomData = {
      hotel_id: '',
      name: 'Test Room Y1A',
      description: 'A test room for integration testing',
      size_sqm: 25,
      bed_setup: '1 Queen Bed',
      base_price: 120.0,
      airbnb_price: 130.0,
      booking_com_price: 140.0,
      max_capacity: 2,
      status: 'available',
      amenities: ['WiFi', 'Air Conditioning', 'TV'],
      pet_fee: 25.0,
      minimum_nights: 2,
      cleaning_fee: 50.0,
    };

    beforeEach(() => {
      validRoomData.hotel_id = testHotel.id;
    });

    it('should create a room successfully without images', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .field('data', JSON.stringify(validRoomData))
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        hotel_id: testHotel.id,
        name: 'Test Room Y1A',
        description: 'A test room for integration testing',
        base_price: 120.0,
        image_urls: [],
      });

      // Verify in database
      const createdRoom = await prismaService.room.findUnique({
        where: { id: response.body.id },
        include: { room_photos: true },
      });

      expect(createdRoom).toBeTruthy();
      expect(createdRoom.room_photos).toHaveLength(0);
    });

    it('should create a room with images atomically', async () => {
      // Create test image files
      const testImagePath1 = path.join(__dirname, 'test-image-1.jpg');
      const testImagePath2 = path.join(__dirname, 'test-image-2.jpg');

      // Create simple test image content (minimal JPEG header)
      const testImageContent = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
      ]);

      fs.writeFileSync(testImagePath1, testImageContent);
      fs.writeFileSync(testImagePath2, testImageContent);

      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${authToken}`)
          .field('data', JSON.stringify(validRoomData))
          .attach('images', testImagePath1)
          .attach('images', testImagePath2)
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          hotel_id: testHotel.id,
          name: 'Test Room Y1A',
          image_urls: expect.arrayContaining([
            expect.stringMatching(/\/uploads\/rooms\/.+\.jpg$/),
            expect.stringMatching(/\/uploads\/rooms\/.+\.jpg$/),
          ]),
        });

        expect(response.body.image_urls).toHaveLength(2);

        // Verify in database
        const createdRoom = await prismaService.room.findUnique({
          where: { id: response.body.id },
          include: { room_photos: true },
        });

        expect(createdRoom.room_photos).toHaveLength(2);
        expect(createdRoom.room_photos[0].sort_order).toBe(1);
        expect(createdRoom.room_photos[1].sort_order).toBe(2);
      } finally {
        // Clean up test files
        if (fs.existsSync(testImagePath1)) fs.unlinkSync(testImagePath1);
        if (fs.existsSync(testImagePath2)) fs.unlinkSync(testImagePath2);
      }
    });

    it('should rollback room creation if database constraint fails', async () => {
      // First create a room with the same name
      await prismaService.room.create({
        data: {
          hotel_id: testHotel.id,
          name: 'Duplicate Room Name',
          base_price: 100.0,
          max_capacity: 2,
        },
      });

      const duplicateRoomData = {
        ...validRoomData,
        name: 'Duplicate Room Name', // This should cause a constraint violation
      };

      const testImagePath = path.join(__dirname, 'test-rollback-image.jpg');
      const testImageContent = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
      ]);
      fs.writeFileSync(testImagePath, testImageContent);

      try {
        // This should fail due to duplicate name
        await request(app.getHttpServer())
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${authToken}`)
          .field('data', JSON.stringify(duplicateRoomData))
          .attach('images', testImagePath)
          .expect(400);

        // Verify that no duplicate room was created
        const rooms = await prismaService.room.findMany({
          where: {
            hotel_id: testHotel.id,
            name: 'Duplicate Room Name',
          },
        });

        expect(rooms).toHaveLength(1); // Only the original room should exist

        // Verify that no orphaned room photos were created
        const roomPhotos = await prismaService.roomPhoto.findMany({
          where: {
            room: {
              hotel_id: testHotel.id,
              name: 'Duplicate Room Name',
            },
          },
        });

        expect(roomPhotos).toHaveLength(0); // No photos should exist for failed creation
      } finally {
        if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
      }
    });

    it('should handle invalid JSON data gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .field('data', '{invalid json}')
        .expect(400);

      // Verify no room was created
      const rooms = await prismaService.room.findMany({
        where: { hotel_id: testHotel.id },
      });
      expect(rooms).toHaveLength(0);
    });

    it('should reject invalid file types', async () => {
      const testTextPath = path.join(__dirname, 'test-invalid.txt');
      fs.writeFileSync(testTextPath, 'This is not an image');

      try {
        await request(app.getHttpServer())
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${authToken}`)
          .field('data', JSON.stringify(validRoomData))
          .attach('images', testTextPath)
          .expect(400);

        // Verify no room was created
        const rooms = await prismaService.room.findMany({
          where: { hotel_id: testHotel.id },
        });
        expect(rooms).toHaveLength(0);
      } finally {
        if (fs.existsSync(testTextPath)) fs.unlinkSync(testTextPath);
      }
    });

    it('should reject creation with non-existent hotel_id', async () => {
      const invalidRoomData = {
        ...validRoomData,
        hotel_id: '00000000-0000-0000-0000-000000000000',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .field('data', JSON.stringify(invalidRoomData))
        .expect(404);

      // Verify no room was created
      const rooms = await prismaService.room.findMany({
        where: { hotel_id: testHotel.id },
      });
      expect(rooms).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .field('data', JSON.stringify(validRoomData))
        .expect(401);
    });

    it('should require admin role', async () => {
      // Create a staff user
      const hashedPassword = await bcrypt.hash('staff123', 10);
      const staffUser = await prismaService.user.create({
        data: {
          email: 'staff@example.com',
          password_hash: hashedPassword,
          role: UserRole.staff,
        },
      });

      await prismaService.hotelUsersPivot.create({
        data: {
          user_id: staffUser.id,
          hotel_id: testHotel.id,
        },
      });

      // Get staff token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'staff@example.com',
          password: 'staff123',
        });

      const staffToken = loginResponse.body.access_token;

      // Try to create room with staff token
      await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('data', JSON.stringify(validRoomData))
        .expect(403);

      // Clean up staff user
      await prismaService.hotelUsersPivot.deleteMany({
        where: { user_id: staffUser.id },
      });
      await prismaService.user.delete({
        where: { id: staffUser.id },
      });
    });

    it('should handle large file uploads within limits', async () => {
      // Create a larger test image (but still within 10MB limit)
      const largeImagePath = path.join(__dirname, 'large-test-image.jpg');
      const largeImageContent = Buffer.alloc(1024 * 1024, 0xff); // 1MB file
      // Add JPEG header
      largeImageContent[0] = 0xff;
      largeImageContent[1] = 0xd8;
      largeImageContent[largeImageContent.length - 2] = 0xff;
      largeImageContent[largeImageContent.length - 1] = 0xd9;

      fs.writeFileSync(largeImagePath, largeImageContent);

      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${authToken}`)
          .field('data', JSON.stringify(validRoomData))
          .attach('images', largeImagePath)
          .expect(201);

        expect(response.body.image_urls).toHaveLength(1);

        // Verify the room was created successfully
        const createdRoom = await prismaService.room.findUnique({
          where: { id: response.body.id },
          include: { room_photos: true },
        });

        expect(createdRoom.room_photos).toHaveLength(1);
      } finally {
        if (fs.existsSync(largeImagePath)) fs.unlinkSync(largeImagePath);
      }
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain database consistency after failed operations', async () => {
      const initialRoomCount = await prismaService.room.count({
        where: { hotel_id: testHotel.id },
      });

      const initialPhotoCount = await prismaService.roomPhoto.count({
        where: {
          room: { hotel_id: testHotel.id },
        },
      });

      // Attempt multiple failed operations
      const invalidRoomData = {
        hotel_id: '00000000-0000-0000-0000-000000000000', // Non-existent hotel
        name: 'Invalid Room',
        base_price: 100.0,
        max_capacity: 2,
      };

      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${authToken}`)
          .field('data', JSON.stringify(invalidRoomData))
          .expect(404);
      }

      // Verify database state is unchanged
      const finalRoomCount = await prismaService.room.count({
        where: { hotel_id: testHotel.id },
      });

      const finalPhotoCount = await prismaService.roomPhoto.count({
        where: {
          room: { hotel_id: testHotel.id },
        },
      });

      expect(finalRoomCount).toBe(initialRoomCount);
      expect(finalPhotoCount).toBe(initialPhotoCount);
    });
  });
});
