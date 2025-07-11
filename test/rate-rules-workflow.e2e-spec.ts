/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

describe('Rate Rules Workflow (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let testUser: any;
  let testHotel: any;
  let testRoom: any;

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
        name: 'Rate Rules Test Hotel',
        location: 'Test Location',
      },
    });

    // Create test admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prismaService.user.create({
      data: {
        email: 'test-rate-rules@example.com',
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

    // Create a test room
    testRoom = await prismaService.room.create({
      data: {
        hotel_id: testHotel.id,
        name: 'Rate Rule Test Room',
        description: 'A room for testing rate rules',
        base_price: 100.00,
        max_capacity: 2,
        status: 'available',
      },
    });

    // Get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'test-rate-rules@example.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.rateRule.deleteMany({
      where: { room_id: testRoom.id },
    });

    await prismaService.room.delete({
      where: { id: testRoom.id },
    });

    await prismaService.hotelUsersPivot.deleteMany({
      where: { hotel_id: testHotel.id },
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
    // Clean up rate rules before each test
    await prismaService.rateRule.deleteMany({
      where: { room_id: testRoom.id },
    });
  });

  describe('Complete Rate Rule Workflow', () => {
    it('should create rate rule and apply it in room search pricing', async () => {
      // Step 1: Create a weekend premium rate rule
      const weekendRateRule = {
        room_id: testRoom.id,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        price_per_night: 25.00, // $25 premium for weekends
        min_stay_nights: 2,
        day_of_week: [5, 6], // Friday and Saturday (weekend premium)
        source: 'website',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(weekendRateRule)
        .expect(201);

      expect(createResponse.body).toMatchObject({
        id: expect.any(String),
        room_id: testRoom.id,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        price_per_night: 25.00,
        day_of_week: [5, 6],
        source: 'website',
      });

      // Step 2: Search for available rooms during weekend period
      const searchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-07-05', // Friday
          check_out_date: '2024-07-07', // Sunday (2 nights: Fri-Sat, Sat-Sun)
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      expect(searchResponse.body.available_rooms).toHaveLength(1);
      
      const room = searchResponse.body.available_rooms[0];
      
      // Verify pricing calculation:
      // Friday night: base_price (100) + weekend_premium (25) = 125
      // Saturday night: base_price (100) + weekend_premium (25) = 125
      // Total: 125 + 125 = 250
      expect(room.total_cost).toBe(250.00);
      expect(room.nights).toBe(2);
    });

    it('should handle multiple overlapping rate rules with priority', async () => {
      // Step 1: Create a general summer rate rule (all days)
      const summerRateRule = {
        room_id: testRoom.id,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        price_per_night: 15.00, // $15 summer premium
        day_of_week: [0, 1, 2, 3, 4, 5, 6], // All days
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(summerRateRule)
        .expect(201);

      // Step 2: Create a specific weekend premium (should override general rule)
      const weekendRateRule = {
        room_id: testRoom.id,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        price_per_night: 30.00, // $30 weekend premium (higher than summer)
        day_of_week: [5, 6], // Friday and Saturday only
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(weekendRateRule)
        .expect(201);

      // Step 3: Search for a mixed weekend/weekday period
      const searchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-07-04', // Thursday
          check_out_date: '2024-07-07', // Sunday (3 nights: Thu-Fri, Fri-Sat, Sat-Sun)
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const room = searchResponse.body.available_rooms[0];
      
      // Verify pricing calculation:
      // Thursday night: base_price (100) + summer_premium (15) = 115
      // Friday night: base_price (100) + weekend_premium (30) = 130 (day-specific rule takes priority)
      // Saturday night: base_price (100) + weekend_premium (30) = 130
      // Total: 115 + 130 + 130 = 375
      expect(room.total_cost).toBe(375.00);
      expect(room.nights).toBe(3);
    });

    it('should filter rate rules by hotel_id via room relationship', async () => {
      // Step 1: Create another hotel and room
      const otherHotel = await prismaService.hotel.create({
        data: {
          name: 'Other Hotel',
          location: 'Other Location',
        },
      });

      const otherRoom = await prismaService.room.create({
        data: {
          hotel_id: otherHotel.id,
          name: 'Other Room',
          base_price: 80.00,
          max_capacity: 2,
          status: 'available',
        },
      });

      // Step 2: Create rate rules for both hotels
      const rateRule1 = {
        room_id: testRoom.id,
        start_date: '2024-08-01',
        end_date: '2024-08-31',
        price_per_night: 20.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      const rateRule2 = {
        room_id: otherRoom.id,
        start_date: '2024-08-01',
        end_date: '2024-08-31',
        price_per_night: 30.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateRule1)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateRule2)
        .expect(201);

      // Step 3: Filter rate rules by hotel_id
      const hotelFilterResponse = await request(app.getHttpServer())
        .get('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ hotel_id: testHotel.id })
        .expect(200);

      expect(hotelFilterResponse.body.total).toBe(1);
      expect(hotelFilterResponse.body.rate_rules[0].room_id).toBe(testRoom.id);

      // Step 4: Verify other hotel has its own rate rules
      const otherHotelResponse = await request(app.getHttpServer())
        .get('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ hotel_id: otherHotel.id })
        .expect(200);

      expect(otherHotelResponse.body.total).toBe(1);
      expect(otherHotelResponse.body.rate_rules[0].room_id).toBe(otherRoom.id);

      // Clean up
      await prismaService.rateRule.deleteMany({
        where: { room_id: otherRoom.id },
      });
      await prismaService.room.delete({ where: { id: otherRoom.id } });
      await prismaService.hotel.delete({ where: { id: otherHotel.id } });
    });

    it('should handle platform-specific rate rules', async () => {
      // Step 1: Create platform-specific rate rules
      const websiteRateRule = {
        room_id: testRoom.id,
        start_date: '2024-09-01',
        end_date: '2024-09-30',
        price_per_night: 10.00, // $10 premium for website
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      const airbnbRateRule = {
        room_id: testRoom.id,
        start_date: '2024-09-01',
        end_date: '2024-09-30',
        price_per_night: 20.00, // $20 premium for Airbnb
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'airbnb',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(websiteRateRule)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(airbnbRateRule)
        .expect(201);

      // Step 2: Search with website platform
      const websiteSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-09-15',
          check_out_date: '2024-09-16',
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const websiteRoom = websiteSearchResponse.body.available_rooms[0];
      // base_price (100) + website_premium (10) = 110 for 1 night
      expect(websiteRoom.total_cost).toBe(110.00);

      // Step 3: Search with airbnb platform
      const airbnbSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-09-15',
          check_out_date: '2024-09-16',
          guests: 2,
          platform: 'airbnb',
        })
        .expect(200);

      const airbnbRoom = airbnbSearchResponse.body.available_rooms[0];
      // base_price (100) + airbnb_premium (20) = 120 for 1 night
      expect(airbnbRoom.total_cost).toBe(120.00);

      // Step 4: Filter rate rules by source
      const sourceFilterResponse = await request(app.getHttpServer())
        .get('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ source: 'airbnb' })
        .expect(200);

      expect(sourceFilterResponse.body.total).toBe(1);
      expect(sourceFilterResponse.body.rate_rules[0].source).toBe('airbnb');
      expect(sourceFilterResponse.body.rate_rules[0].price_per_night).toBe(20.00);
    });

    it('should update rate rule and immediately reflect in room search', async () => {
      // Step 1: Create initial rate rule
      const initialRateRule = {
        room_id: testRoom.id,
        start_date: '2024-10-01',
        end_date: '2024-10-31',
        price_per_night: 15.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(initialRateRule)
        .expect(201);

      const rateRuleId = createResponse.body.id;

      // Step 2: Verify initial pricing
      const initialSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-10-15',
          check_out_date: '2024-10-16',
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const initialRoom = initialSearchResponse.body.available_rooms[0];
      expect(initialRoom.total_cost).toBe(115.00); // 100 + 15

      // Step 3: Update rate rule
      const updateData = {
        price_per_night: 25.00, // Increase premium
      };

      await request(app.getHttpServer())
        .put(`/api/v1/rate-rules/${rateRuleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Step 4: Verify updated pricing
      const updatedSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-10-15',
          check_out_date: '2024-10-16',
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const updatedRoom = updatedSearchResponse.body.available_rooms[0];
      expect(updatedRoom.total_cost).toBe(125.00); // 100 + 25 (updated premium)
    });

    it('should delete rate rule and revert to base pricing', async () => {
      // Step 1: Create rate rule
      const rateRule = {
        room_id: testRoom.id,
        start_date: '2024-11-01',
        end_date: '2024-11-30',
        price_per_night: 20.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateRule)
        .expect(201);

      const rateRuleId = createResponse.body.id;

      // Step 2: Verify premium pricing
      const premiumSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-11-15',
          check_out_date: '2024-11-16',
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const premiumRoom = premiumSearchResponse.body.available_rooms[0];
      expect(premiumRoom.total_cost).toBe(120.00); // 100 + 20

      // Step 3: Delete rate rule
      await request(app.getHttpServer())
        .delete(`/api/v1/rate-rules/${rateRuleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Step 4: Verify base pricing
      const baseSearchResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2024-11-15',
          check_out_date: '2024-11-16',
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      const baseRoom = baseSearchResponse.body.available_rooms[0];
      expect(baseRoom.total_cost).toBe(100.00); // Base price only
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should prevent conflicting rate rules', async () => {
      // Step 1: Create first rate rule
      const firstRateRule = {
        room_id: testRoom.id,
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        price_per_night: 15.00,
        day_of_week: [1, 2, 3], // Monday, Tuesday, Wednesday
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstRateRule)
        .expect(201);

      // Step 2: Try to create conflicting rate rule
      const conflictingRateRule = {
        room_id: testRoom.id,
        start_date: '2024-12-15',
        end_date: '2024-12-31',
        price_per_night: 25.00,
        day_of_week: [2, 3, 4], // Overlaps on Tuesday, Wednesday
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictingRateRule)
        .expect(409); // Conflict

      // Step 3: Verify only the first rule exists
      const rateRulesResponse = await request(app.getHttpServer())
        .get('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ room_id: testRoom.id })
        .expect(200);

      expect(rateRulesResponse.body.total).toBe(1);
      expect(rateRulesResponse.body.rate_rules[0].price_per_night).toBe(15.00);
    });

    it('should handle minimum stay requirements with rate rules', async () => {
      // Step 1: Create rate rule with minimum stay requirement
      const minStayRateRule = {
        room_id: testRoom.id,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        price_per_night: 30.00,
        min_stay_nights: 3, // Minimum 3 nights
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      };

      await request(app.getHttpServer())
        .post('/api/v1/rate-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(minStayRateRule)
        .expect(201);

      // Step 2: Search for 2 nights (should not include this room due to min stay)
      const shortStayResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2025-01-15',
          check_out_date: '2025-01-17', // Only 2 nights
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      expect(shortStayResponse.body.available_rooms).toHaveLength(0);

      // Step 3: Search for 3 nights (should include the room)
      const longStayResponse = await request(app.getHttpServer())
        .get('/api/v1/rooms/search')
        .query({
          hotel_id: testHotel.id,
          check_in_date: '2025-01-15',
          check_out_date: '2025-01-18', // 3 nights
          guests: 2,
          platform: 'website',
        })
        .expect(200);

      expect(longStayResponse.body.available_rooms).toHaveLength(1);
      const room = longStayResponse.body.available_rooms[0];
      expect(room.total_cost).toBe(390.00); // (100 + 30) * 3 nights
    });
  });
});