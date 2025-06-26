import { ApiProperty } from '@nestjs/swagger';

export class OccupancyRateDto {
  @ApiProperty({
    description: 'Start date for the period',
    example: '2025-01-01',
  })
  start_date: string;

  @ApiProperty({
    description: 'End date for the period',
    example: '2025-01-31',
  })
  end_date: string;

  @ApiProperty({
    description: 'Total number of available room nights',
    example: 480,
  })
  total_room_nights: number;

  @ApiProperty({
    description: 'Number of occupied room nights',
    example: 312,
  })
  occupied_room_nights: number;

  @ApiProperty({
    description: 'Occupancy rate as percentage',
    example: 65.0,
  })
  occupancy_rate: number;
}

export class MonthlyRevenueDto {
  @ApiProperty({
    description: 'Year and month',
    example: '2025-01',
  })
  month: string;

  @ApiProperty({
    description: 'Total revenue for the month in cents',
    example: 125000,
  })
  total_revenue: number;

  @ApiProperty({
    description: 'Total revenue for the month in dollars',
    example: 1250.0,
  })
  total_revenue_dollars: number;

  @ApiProperty({
    description: 'Number of bookings',
    example: 25,
  })
  booking_count: number;

  @ApiProperty({
    description: 'Average booking value in cents',
    example: 5000,
  })
  average_booking_value: number;
}

export class AverageDailyRateDto {
  @ApiProperty({
    description: 'Start date for the period',
    example: '2025-01-01',
  })
  start_date: string;

  @ApiProperty({
    description: 'End date for the period',
    example: '2025-01-31',
  })
  end_date: string;

  @ApiProperty({
    description: 'Total revenue in cents',
    example: 125000,
  })
  total_revenue: number;

  @ApiProperty({
    description: 'Number of occupied room nights',
    example: 312,
  })
  occupied_room_nights: number;

  @ApiProperty({
    description: 'Average daily rate in cents',
    example: 4006,
  })
  adr_cents: number;

  @ApiProperty({
    description: 'Average daily rate in dollars',
    example: 40.06,
  })
  adr_dollars: number;
}

export class BookingTrendsDto {
  @ApiProperty({
    description: 'Month in YYYY-MM format',
    example: '2025-01',
  })
  month: string;

  @ApiProperty({
    description: 'Total bookings for the month',
    example: 25,
  })
  total_bookings: number;

  @ApiProperty({
    description: 'Confirmed bookings',
    example: 23,
  })
  confirmed_bookings: number;

  @ApiProperty({
    description: 'Cancelled bookings',
    example: 2,
  })
  cancelled_bookings: number;

  @ApiProperty({
    description: 'Pending bookings',
    example: 0,
  })
  pending_bookings: number;

  @ApiProperty({
    description: 'Month-over-month growth percentage',
    example: 12.5,
  })
  growth_percentage: number;
}

export class CheckInsTodayDto {
  @ApiProperty({
    description: 'Date for check-ins',
    example: '2025-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Total number of check-ins today',
    example: 5,
  })
  total_checkins: number;

  @ApiProperty({
    description: 'List of check-in details',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', example: 'booking-uuid' },
        reference_number: { type: 'string', example: 'HLN-20250115-001' },
        guest_name: { type: 'string', example: 'John Doe' },
        guest_email: { type: 'string', example: 'john@example.com' },
        room_name: { type: 'string', example: 'Y1A' },
        check_in_date: { type: 'string', example: '2025-01-15' },
        check_out_date: { type: 'string', example: '2025-01-18' },
        total_cost: { type: 'number', example: 36000 },
        nights: { type: 'number', example: 3 },
      },
    },
  })
  checkins: Array<{
    booking_id: string;
    reference_number: string;
    guest_name: string;
    guest_email: string;
    room_name: string;
    check_in_date: string;
    check_out_date: string;
    total_cost: number;
    nights: number;
  }>;
}
