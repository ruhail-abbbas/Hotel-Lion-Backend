import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import {
  OccupancyRateDto,
  MonthlyRevenueDto,
  AverageDailyRateDto,
  BookingTrendsDto,
  CheckInsTodayDto,
  CheckOutsTodayDto,
} from './dto/stats-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Statistics')
@Controller('api/v1/admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth('JWT-auth')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('occupancy-rate')
  @ApiOperation({
    summary: 'Get occupancy rate for a date range',
    description:
      'Calculate occupancy rate as percentage of occupied vs available room nights',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'start_date',
    description: 'Start date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'end_date',
    description: 'End date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Occupancy rate statistics',
    type: OccupancyRateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date format or parameters',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getOccupancyRate(
    @Query('hotel_id') hotelId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ): Promise<OccupancyRateDto> {
    if (!hotelId || !startDate || !endDate) {
      throw new BadRequestException(
        'hotel_id, start_date, and end_date are required',
      );
    }

    // Validate date format
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('start_date must be before end_date');
    }

    return this.statsService.getOccupancyRate(hotelId, startDate, endDate);
  }

  @Get('monthly-revenue')
  @ApiOperation({
    summary: 'Get monthly revenue statistics',
    description:
      'Get total revenue, booking count, and average booking value for a specific month',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'year',
    description: 'Year (YYYY)',
    required: true,
    type: 'number',
    example: 2025,
  })
  @ApiQuery({
    name: 'month',
    description: 'Month (1-12)',
    required: true,
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly revenue statistics',
    type: MonthlyRevenueDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getMonthlyRevenue(
    @Query('hotel_id') hotelId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyRevenueDto> {
    if (!hotelId || !year || !month) {
      throw new BadRequestException('hotel_id, year, and month are required');
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Invalid year or month');
    }

    return this.statsService.getMonthlyRevenue(hotelId, yearNum, monthNum);
  }

  @Get('average-daily-rate')
  @ApiOperation({
    summary: 'Get Average Daily Rate (ADR) for a date range',
    description:
      'Calculate ADR as total revenue divided by occupied room nights',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'start_date',
    description: 'Start date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'end_date',
    description: 'End date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Average Daily Rate statistics',
    type: AverageDailyRateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date format or parameters',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAverageDailyRate(
    @Query('hotel_id') hotelId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ): Promise<AverageDailyRateDto> {
    if (!hotelId || !startDate || !endDate) {
      throw new BadRequestException(
        'hotel_id, start_date, and end_date are required',
      );
    }

    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('start_date must be before end_date');
    }

    return this.statsService.getAverageDailyRate(hotelId, startDate, endDate);
  }

  @Get('booking-trends')
  @ApiOperation({
    summary: 'Get booking trends over multiple months',
    description:
      'Get booking statistics and growth trends for the specified number of months',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'months',
    description: 'Number of months to include (default: 6)',
    required: false,
    type: 'number',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Booking trends statistics',
    type: [BookingTrendsDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getBookingTrends(
    @Query('hotel_id') hotelId: string,
    @Query('months') months?: string,
  ): Promise<BookingTrendsDto[]> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    let monthsNum = 6; // default
    if (months) {
      monthsNum = parseInt(months, 10);
      if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
        throw new BadRequestException('months must be between 1 and 24');
      }
    }

    return this.statsService.getBookingTrends(hotelId, monthsNum);
  }

  @Get('checkins-today')
  @ApiOperation({
    summary: 'Get check-ins for today (or specified date)',
    description:
      'Get list of all confirmed bookings with check-in date on today or specified date',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'date',
    description:
      'Date to check (YYYY-MM-DD). Defaults to today if not provided',
    required: false,
    type: 'string',
    example: '2025-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Check-ins for the specified date',
    type: CheckInsTodayDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getCheckInsToday(
    @Query('hotel_id') hotelId: string,
    @Query('date') date?: string,
  ): Promise<CheckInsTodayDto> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    if (date && !this.isValidDate(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    return this.statsService.getCheckInsToday(hotelId, date);
  }

  @Get('checkouts-today')
  @ApiOperation({
    summary: 'Get check-outs for today (or specified date)',
    description:
      'Get list of all confirmed bookings with check-out date on today or specified date',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'date',
    description:
      'Date to check (YYYY-MM-DD). Defaults to today if not provided',
    required: false,
    type: 'string',
    example: '2025-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Check-outs for the specified date',
    type: CheckOutsTodayDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getCheckOutsToday(
    @Query('hotel_id') hotelId: string,
    @Query('date') date?: string,
  ): Promise<CheckOutsTodayDto> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    if (date && !this.isValidDate(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    return this.statsService.getCheckOutsToday(hotelId, date);
  }

  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
