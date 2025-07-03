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

export class RoomStatusDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  room_id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  room_name: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Cozy single room with city view',
  })
  room_description: string;

  @ApiProperty({
    description: 'Maximum capacity',
    example: 2,
  })
  max_capacity: number;

  @ApiProperty({
    description: 'Base price per night in cents',
    example: 12000,
  })
  base_price: number;

  @ApiProperty({
    description: 'Room status',
    enum: ['available', 'out_of_service', 'cleaning'],
    example: 'available',
  })
  room_status: string;

  @ApiProperty({
    description: 'Current booking status',
    enum: ['available', 'occupied', 'checking_in_today', 'checking_out_today'],
    example: 'occupied',
  })
  booking_status: string;

  @ApiProperty({
    description: 'Current booking details (null if room is not booked)',
    nullable: true,
    type: 'object',
    properties: {
      booking_id: { type: 'string', example: 'booking-uuid' },
      reference_number: { type: 'string', example: 'HLN-20250115-001' },
      guest_name: { type: 'string', example: 'John Doe' },
      guest_email: { type: 'string', example: 'john@example.com' },
      guest_contact: { type: 'string', example: '+1234567890' },
      check_in_date: { type: 'string', example: '2025-01-15' },
      check_out_date: { type: 'string', example: '2025-01-18' },
      total_cost: { type: 'number', example: 36000 },
      nights: { type: 'number', example: 3 },
      booking_status: {
        type: 'string',
        enum: ['pending', 'confirmed', 'cancelled'],
        example: 'confirmed',
      },
    },
  })
  booking: {
    booking_id: string;
    reference_number: string;
    guest_name: string;
    guest_email: string;
    guest_contact?: string;
    check_in_date: string;
    check_out_date: string;
    total_cost: number;
    nights: number;
    booking_status: string;
  } | null;
}

export class HotelRoomsStatusDto {
  @ApiProperty({
    description: 'Date for the status check',
    example: '2025-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Total number of rooms',
    example: 14,
  })
  total_rooms: number;

  @ApiProperty({
    description: 'Number of available rooms',
    example: 8,
  })
  available_rooms: number;

  @ApiProperty({
    description: 'Number of occupied rooms',
    example: 5,
  })
  occupied_rooms: number;

  @ApiProperty({
    description: 'Number of rooms out of service',
    example: 1,
  })
  out_of_service_rooms: number;

  @ApiProperty({
    description: 'Number of rooms being cleaned',
    example: 0,
  })
  cleaning_rooms: number;

  @ApiProperty({
    description: 'List of all rooms with their current status',
    type: [RoomStatusDto],
  })
  rooms: RoomStatusDto[];
}

export class CustomerBookingDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'booking-uuid',
  })
  booking_id: string;

  @ApiProperty({
    description: 'Booking reference number',
    example: 'HLN-20250115-001',
  })
  reference_number: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  room_name: string;

  @ApiProperty({
    description: 'Check-in date',
    example: '2025-01-15',
  })
  check_in_date: string;

  @ApiProperty({
    description: 'Check-out date',
    example: '2025-01-18',
  })
  check_out_date: string;

  @ApiProperty({
    description: 'Total cost in cents',
    example: 36000,
  })
  total_cost: number;

  @ApiProperty({
    description: 'Number of nights',
    example: 3,
  })
  nights: number;

  @ApiProperty({
    description: 'Booking status',
    enum: ['pending', 'confirmed', 'cancelled'],
    example: 'confirmed',
  })
  status: string;

  @ApiProperty({
    description: 'Booking source',
    example: 'Website',
  })
  source: string;

  @ApiProperty({
    description: 'Booking creation date',
    example: '2025-01-10T10:30:00Z',
  })
  created_at: string;
}

export class CustomerDto {
  @ApiProperty({
    description: 'Customer email (unique identifier)',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Customer contact number',
    example: '+1234567890',
  })
  contact: string;

  @ApiProperty({
    description: 'Total number of bookings',
    example: 3,
  })
  total_bookings: number;

  @ApiProperty({
    description: 'Total amount spent in cents',
    example: 108000,
  })
  total_spent: number;

  @ApiProperty({
    description: 'Date of first booking',
    example: '2024-06-15T14:20:00Z',
  })
  first_booking_date: string;

  @ApiProperty({
    description: 'Date of last booking',
    example: '2025-01-10T10:30:00Z',
  })
  last_booking_date: string;

  @ApiProperty({
    description: 'List of all customer bookings',
    type: [CustomerBookingDto],
  })
  bookings: CustomerBookingDto[];
}

export class CustomersListDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Total number of customers',
    example: 25,
  })
  total_customers: number;

  @ApiProperty({
    description:
      'Number of returning customers (customers with more than 1 booking)',
    example: 8,
  })
  returning_customers: number;

  @ApiProperty({
    description: 'Percentage of returning customers',
    example: 32.0,
  })
  returning_customers_percentage: number;

  @ApiProperty({
    description: 'Total bookings across all customers',
    example: 78,
  })
  total_bookings: number;

  @ApiProperty({
    description: 'Total revenue from all customers in cents',
    example: 2340000,
  })
  total_revenue: number;

  @ApiProperty({
    description: 'Average customer lifetime value in cents',
    example: 93600,
  })
  average_customer_value: number;

  @ApiProperty({
    description: 'List of all customers with their bookings',
    type: [CustomerDto],
  })
  customers: CustomerDto[];
}

export class CheckOutsTodayDto {
  @ApiProperty({
    description: 'Date for check-outs',
    example: '2025-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Total number of check-outs today',
    example: 3,
  })
  total_checkouts: number;

  @ApiProperty({
    description: 'List of check-out details',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', example: 'booking-uuid' },
        reference_number: { type: 'string', example: 'HLN-20250115-001' },
        guest_name: { type: 'string', example: 'John Doe' },
        guest_email: { type: 'string', example: 'john@example.com' },
        room_name: { type: 'string', example: 'Y1A' },
        check_in_date: { type: 'string', example: '2025-01-12' },
        check_out_date: { type: 'string', example: '2025-01-15' },
        total_cost: { type: 'number', example: 36000 },
        nights: { type: 'number', example: 3 },
      },
    },
  })
  checkouts: Array<{
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

export class MonthlyOccupancyDto {
  @ApiProperty({
    description: 'Month number (1-12)',
    example: 1,
  })
  month: number;

  @ApiProperty({
    description: 'Month name',
    example: 'January',
  })
  month_name: string;

  @ApiProperty({
    description: 'Year and month in YYYY-MM format',
    example: '2025-01',
  })
  year_month: string;

  @ApiProperty({
    description: 'Total available room nights for the month',
    example: 434,
  })
  total_room_nights: number;

  @ApiProperty({
    description: 'Number of occupied room nights',
    example: 298,
  })
  occupied_room_nights: number;

  @ApiProperty({
    description: 'Occupancy rate as percentage',
    example: 68.66,
  })
  occupancy_rate: number;

  @ApiProperty({
    description: 'Total bookings for the month',
    example: 25,
  })
  total_bookings: number;

  @ApiProperty({
    description: 'Total revenue for the month in cents',
    example: 375000,
  })
  total_revenue: number;
}

export class YearlyCalendarDto {
  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  year: number;

  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Total rooms in the hotel',
    example: 14,
  })
  total_rooms: number;

  @ApiProperty({
    description: 'Average occupancy rate for the year',
    example: 65.5,
  })
  average_occupancy_rate: number;

  @ApiProperty({
    description: 'Total revenue for the year in cents',
    example: 4500000,
  })
  total_yearly_revenue: number;

  @ApiProperty({
    description: 'Monthly occupancy data for all 12 months',
    type: [MonthlyOccupancyDto],
  })
  months: MonthlyOccupancyDto[];
}
