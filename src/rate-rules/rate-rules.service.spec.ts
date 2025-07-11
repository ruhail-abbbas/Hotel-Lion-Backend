import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RateRulesService } from './rate-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';
import { UpdateRateRuleDto } from './dto/update-rate-rule.dto';
import { RateRuleQueryDto } from './dto/rate-rule-query.dto';

describe('RateRulesService', () => {
  let service: RateRulesService;
  let prismaService: PrismaService;

  const mockRoom = {
    id: 'room-id-1',
    hotel_id: 'hotel-id-1',
    name: 'Y1A',
  };

  const mockRateRule = {
    id: 'rate-rule-id-1',
    room_id: 'room-id-1',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-07'),
    price_per_night: 50.00,
    min_stay_nights: 2,
    day_of_week: [0, 1, 2, 3, 4, 5, 6], // All days
    source: 'website',
  };

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    rateRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateRulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RateRulesService>(RateRulesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createRateRuleDto: CreateRateRuleDto = {
      room_id: 'room-id-1',
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      price_per_night: 50.00,
      min_stay_nights: 2,
      day_of_week: [0, 1, 2, 3, 4, 5, 6],
      source: 'website',
    };

    it('should create a rate rule successfully', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.rateRule.findMany.mockResolvedValue([]); // No overlapping rules
      mockPrismaService.rateRule.create.mockResolvedValue(mockRateRule);

      const result = await service.create(createRateRuleDto);

      expect(result).toEqual({
        id: mockRateRule.id,
        room_id: mockRateRule.room_id,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        price_per_night: 50.00,
        min_stay_nights: 2,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      });

      expect(mockPrismaService.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-id-1' },
      });
      expect(mockPrismaService.rateRule.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if room does not exist', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue(null);

      await expect(service.create(createRateRuleDto)).rejects.toThrow(
        new NotFoundException('Room with ID room-id-1 not found'),
      );

      expect(mockPrismaService.rateRule.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid date range', async () => {
      const invalidDto = {
        ...createRateRuleDto,
        start_date: '2024-01-07',
        end_date: '2024-01-01', // End before start
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for overlapping rate rules', async () => {
      const overlappingRule = {
        id: 'existing-rule',
        room_id: 'room-id-1',
        start_date: new Date('2024-01-03'),
        end_date: new Date('2024-01-10'),
        day_of_week: [1, 2, 3], // Overlaps with Monday, Tuesday, Wednesday
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.rateRule.findMany.mockResolvedValue([overlappingRule]);

      await expect(service.create(createRateRuleDto)).rejects.toThrow(ConflictException);
    });

    it('should allow non-overlapping rules on different days', async () => {
      const existingRule = {
        id: 'existing-rule',
        room_id: 'room-id-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        day_of_week: [1, 2, 3], // Monday, Tuesday, Wednesday only
      };

      const nonOverlappingDto = {
        ...createRateRuleDto,
        day_of_week: [4, 5, 6], // Thursday, Friday, Saturday only
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.rateRule.findMany.mockResolvedValue([existingRule]);
      mockPrismaService.rateRule.create.mockResolvedValue({
        ...mockRateRule,
        day_of_week: [4, 5, 6],
      });

      const result = await service.create(nonOverlappingDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.rateRule.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all rate rules without filters', async () => {
      const mockRateRules = [mockRateRule];
      mockPrismaService.rateRule.findMany.mockResolvedValue(mockRateRules);

      const result = await service.findAll({});

      expect(result).toEqual({
        total: 1,
        rate_rules: [
          {
            id: mockRateRule.id,
            room_id: mockRateRule.room_id,
            start_date: '2024-01-01',
            end_date: '2024-01-07',
            price_per_night: 50.00,
            min_stay_nights: 2,
            day_of_week: [0, 1, 2, 3, 4, 5, 6],
            source: 'website',
          },
        ],
      });
    });

    it('should filter by room_id', async () => {
      const query: RateRuleQueryDto = { room_id: 'room-id-1' };
      mockPrismaService.rateRule.findMany.mockResolvedValue([mockRateRule]);

      await service.findAll(query);

      expect(mockPrismaService.rateRule.findMany).toHaveBeenCalledWith({
        where: { room_id: 'room-id-1' },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              hotel_id: true,
            },
          },
        },
        orderBy: [
          { room_id: 'asc' },
          { start_date: 'asc' },
          { source: 'asc' },
        ],
      });
    });

    it('should filter by hotel_id via room relationship', async () => {
      const query: RateRuleQueryDto = { hotel_id: 'hotel-id-1' };
      mockPrismaService.rateRule.findMany.mockResolvedValue([mockRateRule]);

      await service.findAll(query);

      expect(mockPrismaService.rateRule.findMany).toHaveBeenCalledWith({
        where: {
          room: {
            hotel_id: 'hotel-id-1',
          },
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              hotel_id: true,
            },
          },
        },
        orderBy: [
          { room_id: 'asc' },
          { start_date: 'asc' },
          { source: 'asc' },
        ],
      });
    });

    it('should filter by source', async () => {
      const query: RateRuleQueryDto = { source: 'airbnb' };
      mockPrismaService.rateRule.findMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(mockPrismaService.rateRule.findMany).toHaveBeenCalledWith({
        where: { source: 'airbnb' },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              hotel_id: true,
            },
          },
        },
        orderBy: [
          { room_id: 'asc' },
          { start_date: 'asc' },
          { source: 'asc' },
        ],
      });
    });

    it('should combine multiple filters', async () => {
      const query: RateRuleQueryDto = {
        room_id: 'room-id-1',
        source: 'website',
      };
      mockPrismaService.rateRule.findMany.mockResolvedValue([mockRateRule]);

      await service.findAll(query);

      expect(mockPrismaService.rateRule.findMany).toHaveBeenCalledWith({
        where: {
          room_id: 'room-id-1',
          source: 'website',
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              hotel_id: true,
            },
          },
        },
        orderBy: [
          { room_id: 'asc' },
          { start_date: 'asc' },
          { source: 'asc' },
        ],
      });
    });
  });

  describe('findOne', () => {
    it('should return a rate rule by id', async () => {
      mockPrismaService.rateRule.findUnique.mockResolvedValue(mockRateRule);

      const result = await service.findOne('rate-rule-id-1');

      expect(result).toEqual({
        id: mockRateRule.id,
        room_id: mockRateRule.room_id,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        price_per_night: 50.00,
        min_stay_nights: 2,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
        source: 'website',
      });
    });

    it('should throw NotFoundException if rate rule not found', async () => {
      mockPrismaService.rateRule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Rate rule with ID non-existent-id not found'),
      );
    });
  });

  describe('update', () => {
    const updateRateRuleDto: UpdateRateRuleDto = {
      price_per_night: 75.00,
      min_stay_nights: 3,
    };

    it('should update a rate rule successfully', async () => {
      const updatedRateRule = { ...mockRateRule, ...updateRateRuleDto };
      
      mockPrismaService.rateRule.findUnique.mockResolvedValue(mockRateRule);
      mockPrismaService.rateRule.findMany.mockResolvedValue([]); // No overlapping rules
      mockPrismaService.rateRule.update.mockResolvedValue(updatedRateRule);

      const result = await service.update('rate-rule-id-1', updateRateRuleDto);

      expect(result.price_per_night).toBe(75.00);
      expect(result.min_stay_nights).toBe(3);
    });

    it('should throw NotFoundException if rate rule not found', async () => {
      mockPrismaService.rateRule.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateRateRuleDto),
      ).rejects.toThrow(
        new NotFoundException('Rate rule with ID non-existent-id not found'),
      );
    });

    it('should validate date range when updating dates', async () => {
      const invalidUpdate: UpdateRateRuleDto = {
        start_date: '2024-01-10',
        end_date: '2024-01-05', // End before start
      };

      mockPrismaService.rateRule.findUnique.mockResolvedValue(mockRateRule);

      await expect(
        service.update('rate-rule-id-1', invalidUpdate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a rate rule successfully', async () => {
      mockPrismaService.rateRule.findUnique.mockResolvedValue(mockRateRule);
      mockPrismaService.rateRule.delete.mockResolvedValue(mockRateRule);

      const result = await service.remove('rate-rule-id-1');

      expect(result).toEqual({
        message: 'Rate rule rate-rule-id-1 has been successfully deleted',
      });
      expect(mockPrismaService.rateRule.delete).toHaveBeenCalledWith({
        where: { id: 'rate-rule-id-1' },
      });
    });

    it('should throw NotFoundException if rate rule not found', async () => {
      mockPrismaService.rateRule.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('Rate rule with ID non-existent-id not found'),
      );

      expect(mockPrismaService.rateRule.delete).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and validation', () => {
    it('should handle very long date ranges', async () => {
      const longRangeDto: CreateRateRuleDto = {
        room_id: 'room-id-1',
        start_date: '2024-01-01',
        end_date: '2029-01-01', // 5 years - at the boundary
        price_per_night: 50.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.rateRule.findMany.mockResolvedValue([]);
      mockPrismaService.rateRule.create.mockResolvedValue(mockRateRule);

      const result = await service.create(longRangeDto);
      expect(result).toBeDefined();
    });

    it('should reject dates too far in the future', async () => {
      const futureDto: CreateRateRuleDto = {
        room_id: 'room-id-1',
        start_date: '2030-01-01', // Too far in the future
        end_date: '2030-01-07',
        price_per_night: 50.00,
        day_of_week: [0, 1, 2, 3, 4, 5, 6],
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);

      await expect(service.create(futureDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle partial day overlap scenarios', async () => {
      const existingRule = {
        id: 'existing-rule',
        room_id: 'room-id-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        day_of_week: [1, 2], // Monday, Tuesday only
      };

      const newRuleDto: CreateRateRuleDto = {
        room_id: 'room-id-1',
        start_date: '2024-01-03',
        end_date: '2024-01-10',
        price_per_night: 60.00,
        day_of_week: [2, 3], // Tuesday, Wednesday - overlaps on Tuesday
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.rateRule.findMany.mockResolvedValue([existingRule]);

      await expect(service.create(newRuleDto)).rejects.toThrow(ConflictException);
    });

    it('should handle empty day_of_week arrays gracefully', async () => {
      const emptyDaysDto: CreateRateRuleDto = {
        room_id: 'room-id-1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        price_per_night: 50.00,
        day_of_week: [], // Empty array - should be handled by validation
      };

      mockPrismaService.room.findUnique.mockResolvedValue(mockRoom);

      // This should be caught by class-validator before reaching the service
      // But we test the service behavior anyway
      await expect(service.create(emptyDaysDto)).rejects.toThrow();
    });
  });
});