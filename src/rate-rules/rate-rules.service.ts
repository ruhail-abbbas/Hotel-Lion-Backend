import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';
import { UpdateRateRuleDto } from './dto/update-rate-rule.dto';
import {
  RateRuleResponseDto,
  RateRuleListResponseDto,
} from './dto/rate-rule-response.dto';
import { RateRuleQueryDto } from './dto/rate-rule-query.dto';

@Injectable()
export class RateRulesService {
  private readonly logger = new Logger(RateRulesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createRateRuleDto: CreateRateRuleDto,
  ): Promise<RateRuleResponseDto> {
    // Validate that room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createRateRuleDto.room_id },
    });

    if (!room) {
      throw new NotFoundException(
        `Room with ID ${createRateRuleDto.room_id} not found`,
      );
    }

    // Validate date range
    this.validateDateRange(
      createRateRuleDto.start_date,
      createRateRuleDto.end_date,
    );

    // Check for overlapping rate rules
    await this.checkForOverlappingRules(
      createRateRuleDto.room_id,
      createRateRuleDto.start_date,
      createRateRuleDto.end_date,
      createRateRuleDto.day_of_week,
      createRateRuleDto.source,
    );

    try {
      const rateRule = await this.prisma.rateRule.create({
        data: {
          room_id: createRateRuleDto.room_id,
          start_date: new Date(createRateRuleDto.start_date),
          end_date: new Date(createRateRuleDto.end_date),
          price_per_night: createRateRuleDto.price_per_night,
          min_stay_nights: createRateRuleDto.min_stay_nights,
          day_of_week: createRateRuleDto.day_of_week,
          source: createRateRuleDto.source,
        },
      });

      this.logger.log(
        `Created rate rule ${rateRule.id} for room ${createRateRuleDto.room_id}`,
      );

      return this.formatRateRuleResponse(rateRule);
    } catch (error) {
      this.logger.error('Failed to create rate rule:', error);
      throw new BadRequestException('Failed to create rate rule');
    }
  }

  async findAll(query: RateRuleQueryDto): Promise<RateRuleListResponseDto> {
    const where: Record<string, any> = {};

    // Direct room filtering
    if (query.room_id) {
      where.room_id = query.room_id;
    }

    // Hotel filtering via room relationship
    if (query.hotel_id) {
      where.room = {
        hotel_id: query.hotel_id,
      };
    }

    // Source filtering
    if (query.source) {
      where.source = query.source;
    }

    try {
      const rateRules = await this.prisma.rateRule.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              hotel_id: true,
            },
          },
        },
        orderBy: [{ room_id: 'asc' }, { start_date: 'asc' }, { source: 'asc' }],
      });

      return {
        total: rateRules.length,
        rate_rules: rateRules.map((rule) => this.formatRateRuleResponse(rule)),
      };
    } catch (error) {
      this.logger.error('Failed to fetch rate rules:', error);
      throw new BadRequestException('Failed to fetch rate rules');
    }
  }

  async findOne(id: string): Promise<RateRuleResponseDto> {
    const rateRule = await this.prisma.rateRule.findUnique({
      where: { id },
    });

    if (!rateRule) {
      throw new NotFoundException(`Rate rule with ID ${id} not found`);
    }

    return this.formatRateRuleResponse(rateRule);
  }

  async update(
    id: string,
    updateRateRuleDto: UpdateRateRuleDto,
  ): Promise<RateRuleResponseDto> {
    // Check if rate rule exists
    const existingRateRule = await this.prisma.rateRule.findUnique({
      where: { id },
    });

    if (!existingRateRule) {
      throw new NotFoundException(`Rate rule with ID ${id} not found`);
    }

    // Validate date range if both dates are provided
    const startDate =
      updateRateRuleDto.start_date ||
      existingRateRule.start_date.toISOString().split('T')[0];
    const endDate =
      updateRateRuleDto.end_date ||
      existingRateRule.end_date.toISOString().split('T')[0];

    this.validateDateRange(startDate, endDate);

    // Check for overlapping rules if relevant fields are being updated
    if (
      updateRateRuleDto.start_date ||
      updateRateRuleDto.end_date ||
      updateRateRuleDto.day_of_week ||
      updateRateRuleDto.source
    ) {
      await this.checkForOverlappingRules(
        existingRateRule.room_id,
        startDate,
        endDate,
        updateRateRuleDto.day_of_week || existingRateRule.day_of_week,
        updateRateRuleDto.source !== undefined
          ? updateRateRuleDto.source
          : existingRateRule.source || undefined,
        id, // Exclude current rule from overlap check
      );
    }

    try {
      const updateData: Record<string, any> = {};

      if (updateRateRuleDto.start_date) {
        updateData.start_date = new Date(updateRateRuleDto.start_date);
      }
      if (updateRateRuleDto.end_date) {
        updateData.end_date = new Date(updateRateRuleDto.end_date);
      }
      if (updateRateRuleDto.price_per_night !== undefined) {
        updateData.price_per_night = updateRateRuleDto.price_per_night;
      }
      if (updateRateRuleDto.min_stay_nights !== undefined) {
        updateData.min_stay_nights = updateRateRuleDto.min_stay_nights;
      }
      if (updateRateRuleDto.day_of_week) {
        updateData.day_of_week = updateRateRuleDto.day_of_week;
      }
      if (updateRateRuleDto.source !== undefined) {
        updateData.source = updateRateRuleDto.source;
      }

      const updatedRateRule = await this.prisma.rateRule.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Updated rate rule ${id}`);

      return this.formatRateRuleResponse(updatedRateRule);
    } catch (error) {
      this.logger.error(`Failed to update rate rule ${id}:`, error);
      throw new BadRequestException('Failed to update rate rule');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if rate rule exists
    const rateRule = await this.prisma.rateRule.findUnique({
      where: { id },
    });

    if (!rateRule) {
      throw new NotFoundException(`Rate rule with ID ${id} not found`);
    }

    try {
      await this.prisma.rateRule.delete({
        where: { id },
      });

      this.logger.log(`Deleted rate rule ${id}`);

      return {
        message: `Rate rule ${id} has been successfully deleted`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete rate rule ${id}:`, error);
      throw new BadRequestException('Failed to delete rate rule');
    }
  }

  private validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('start_date must be before end_date');
    }

    // Check that dates are not too far in the past
    const now = new Date();
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );

    if (end < oneYearAgo) {
      throw new BadRequestException(
        'end_date cannot be more than one year in the past',
      );
    }

    // Check that dates are not too far in the future
    const fiveYearsFromNow = new Date(
      now.getFullYear() + 5,
      now.getMonth(),
      now.getDate(),
    );

    if (start > fiveYearsFromNow) {
      throw new BadRequestException(
        'start_date cannot be more than five years in the future',
      );
    }
  }

  private async checkForOverlappingRules(
    roomId: string,
    startDate: string,
    endDate: string,
    dayOfWeek: number[],
    source?: string,
    excludeRuleId?: string,
  ): Promise<void> {
    const where: Record<string, any> = {
      room_id: roomId,
      AND: [
        {
          start_date: {
            lte: new Date(endDate),
          },
        },
        {
          end_date: {
            gte: new Date(startDate),
          },
        },
      ],
    };

    if (source) {
      where.source = source;
    }

    if (excludeRuleId) {
      where.id = { not: excludeRuleId };
    }

    const overlappingRules = await this.prisma.rateRule.findMany({
      where,
    });

    // Check for day-of-week overlaps
    for (const rule of overlappingRules) {
      const hasOverlappingDays = rule.day_of_week.some((day) =>
        dayOfWeek.includes(day),
      );

      if (hasOverlappingDays) {
        throw new ConflictException(
          `Rate rule conflicts with existing rule ${rule.id}. Overlapping date range and days of the week.`,
        );
      }
    }
  }

  private formatRateRuleResponse(rateRule: {
    id: string;
    room_id: string;
    start_date: Date;
    end_date: Date;
    price_per_night: number | { toString(): string };
    min_stay_nights: number | null;
    day_of_week: number[];
    source: string | null;
  }): RateRuleResponseDto {
    return {
      id: rateRule.id,
      room_id: rateRule.room_id,
      start_date: rateRule.start_date.toISOString().split('T')[0],
      end_date: rateRule.end_date.toISOString().split('T')[0],
      price_per_night:
        typeof rateRule.price_per_night === 'number'
          ? rateRule.price_per_night
          : parseFloat(rateRule.price_per_night.toString()),
      min_stay_nights: rateRule.min_stay_nights || 1,
      day_of_week: rateRule.day_of_week,
      source: rateRule.source || 'Website',
    };
  }
}
