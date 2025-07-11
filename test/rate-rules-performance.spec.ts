import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from '../src/rooms/rooms.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AirbnbService } from '../src/airbnb/airbnb.service';

describe('Rate Rules Performance', () => {
  let service: RoomsService;

  const mockRoom = {
    id: 'room-id-1',
    base_price: 100.0,
    airbnb_price: null,
    booking_com_price: null,
    rate_rules: [],
  };

  const mockPrismaService = {
    room: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
    rateRule: { findMany: jest.fn() },
  };

  const mockAirbnbService = {
    getListingsByRoom: jest.fn().mockResolvedValue([]),
    getCalendarData: jest.fn().mockResolvedValue({ calendar: [] }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AirbnbService,
          useValue: mockAirbnbService,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  describe('Rate Rule Calculation Performance', () => {
    it('should handle no rate rules efficiently', () => {
      const roomWithNoRules = { ...mockRoom, rate_rules: [] };
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-08'); // 7 nights

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        service.calculateRoomPricing(roomWithNoRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete 1000 calculations in under 100ms
    });

    it('should handle simple rate rules efficiently', () => {
      const roomWithSimpleRules = {
        ...mockRoom,
        rate_rules: [
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 25.0,
            day_of_week: [0, 1, 2, 3, 4, 5, 6], // All days
          },
        ],
      };

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-08'); // 7 nights

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        service.calculateRoomPricing(roomWithSimpleRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(200); // Should complete 1000 calculations in under 200ms
    });

    it('should handle complex rate rules efficiently', () => {
      const roomWithComplexRules = {
        ...mockRoom,
        rate_rules: [
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 15.0,
            day_of_week: [0, 1, 2, 3, 4, 5, 6], // General rule
          },
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 30.0,
            day_of_week: [5, 6], // Weekend premium
          },
          {
            start_date: new Date('2024-07-01'),
            end_date: new Date('2024-08-31'),
            price_per_night: 40.0,
            day_of_week: [5, 6], // Summer weekend premium
          },
          {
            start_date: new Date('2024-12-20'),
            end_date: new Date('2024-12-31'),
            price_per_night: 50.0,
            day_of_week: [0, 1, 2, 3, 4, 5, 6], // Holiday premium
          },
        ],
      };

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-30'); // 29 nights

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        service.calculateRoomPricing(roomWithComplexRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(300); // Should complete 500 calculations in under 300ms
    });

    it('should handle long stays efficiently', () => {
      const roomWithRules = {
        ...mockRoom,
        rate_rules: [
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 25.0,
            day_of_week: [5, 6], // Weekend premium
          },
        ],
      };

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-12-31'); // Almost full year

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        service.calculateRoomPricing(roomWithRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(500); // Should complete 100 calculations in under 500ms
    });

    it('should handle many overlapping rate rules efficiently', () => {
      // Create many overlapping rules to stress test the algorithm
      const manyRules = [];
      for (let month = 1; month <= 12; month++) {
        // Monthly general rule
        manyRules.push({
          start_date: new Date(`2024-${month.toString().padStart(2, '0')}-01`),
          end_date: new Date(`2024-${month.toString().padStart(2, '0')}-28`),
          price_per_night: 10.0 + month,
          day_of_week: [0, 1, 2, 3, 4, 5, 6],
        });

        // Monthly weekend rule
        manyRules.push({
          start_date: new Date(`2024-${month.toString().padStart(2, '0')}-01`),
          end_date: new Date(`2024-${month.toString().padStart(2, '0')}-28`),
          price_per_night: 20.0 + month,
          day_of_week: [5, 6],
        });

        // Special weekday rule for some months
        if (month % 3 === 0) {
          manyRules.push({
            start_date: new Date(
              `2024-${month.toString().padStart(2, '0')}-01`,
            ),
            end_date: new Date(`2024-${month.toString().padStart(2, '0')}-28`),
            price_per_night: 5.0 + month,
            day_of_week: [1, 2, 3, 4],
          });
        }
      }

      const roomWithManyRules = {
        ...mockRoom,
        rate_rules: manyRules,
      };

      const checkIn = new Date('2024-06-01');
      const checkOut = new Date('2024-06-30'); // Full month

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        service.calculateRoomPricing(roomWithManyRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(800); // Should complete 100 calculations in under 800ms
    });

    it('should maintain accuracy with optimization', () => {
      const roomWithRules = {
        ...mockRoom,
        rate_rules: [
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 15.0,
            day_of_week: [0, 1, 2, 3, 4, 5, 6], // General rule
          },
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 25.0,
            day_of_week: [5, 6], // Weekend premium (overrides general)
          },
        ],
      };

      const checkIn = new Date('2024-07-04'); // Thursday
      const checkOut = new Date('2024-07-08'); // Monday (4 nights: Thu, Fri, Sat, Sun)

      const result = service.calculateRoomPricing(
        roomWithRules,
        checkIn,
        checkOut,
      );

      // Expected calculation:
      // Thursday: base (100) + general premium (15) = 115
      // Friday: base (100) + weekend premium (25) = 125
      // Saturday: base (100) + weekend premium (25) = 125
      // Sunday: base (100) + weekend premium (25) = 125
      // Total: 115 + 125 + 125 + 125 = 490

      expect(result.totalCost).toBe(490.0);
      expect(result.basePrice).toBe(115.0); // Lowest rate
    });

    it('should handle edge cases efficiently', () => {
      const roomWithRules = {
        ...mockRoom,
        rate_rules: [
          {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-01'), // Single day rule
            price_per_night: 50.0,
            day_of_week: [1], // Monday only
          },
        ],
      };

      const checkIn = new Date('2024-01-01'); // Monday
      const checkOut = new Date('2024-01-02'); // Tuesday (1 night)

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        service.calculateRoomPricing(roomWithRules, checkIn, checkOut);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(500); // Should complete 10000 calculations in under 500ms
    });

    it('should benchmark memory usage', () => {
      const roomWithRules = {
        ...mockRoom,
        rate_rules: Array(50)
          .fill(null)
          .map((_, i) => ({
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            price_per_night: 10.0 + i,
            day_of_week: [i % 7], // Different days
          })),
      };

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-31');

      // Memory usage should remain consistent across multiple calls
      const measurements = [];
      for (let i = 0; i < 10; i++) {
        const memBefore = process.memoryUsage().heapUsed;
        service.calculateRoomPricing(roomWithRules, checkIn, checkOut);
        const memAfter = process.memoryUsage().heapUsed;
        measurements.push(memAfter - memBefore);
      }

      // Memory usage should be minimal and consistent
      const avgMemoryIncrease =
        measurements.reduce((a: number, b: number) => a + b, 0) /
        measurements.length;
      expect(avgMemoryIncrease).toBeLessThan(1024 * 10); // Less than 10KB average increase
    });
  });

  describe('Platform Price Calculation Performance', () => {
    it('should handle platform price calculations efficiently', () => {
      const roomPricing = {
        base_price: 100.0,
        airbnb_price: 120.0,
        booking_com_price: 130.0,
      };

      const start = performance.now();
      for (let i = 0; i < 100000; i++) {
        service.getPlatformPrice(roomPricing, 'website');
        service.getPlatformPrice(roomPricing, 'airbnb');
        service.getPlatformPrice(roomPricing, 'booking.com');
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete 300k calculations in under 100ms
    });
  });
});
