import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'booking-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Booking reference number',
    example: 'BK-2024-001',
  })
  reference_number: string;

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
    description: 'Guest name',
    example: 'John Doe',
  })
  guest_name: string;

  @ApiProperty({
    description: 'Guest contact (optional)',
    example: '+1234567890',
    required: false,
  })
  guest_contact?: string;

  @ApiProperty({
    description: 'Guest email',
    example: 'john.doe@example.com',
  })
  guest_email: string;

  @ApiProperty({
    description: 'Check-in date',
    example: '2024-01-15',
  })
  check_in_date: string;

  @ApiProperty({
    description: 'Check-out date',
    example: '2024-01-18',
  })
  check_out_date: string;

  @ApiProperty({
    description: 'Booking status',
    example: 'confirmed',
    enum: ['pending', 'confirmed', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Booking source (optional)',
    example: 'Website',
    required: false,
  })
  source?: string;

  @ApiProperty({
    description: 'Total cost in cents',
    example: 36000,
  })
  total_cost: number;

  @ApiProperty({
    description: 'Booking creation date',
    example: '2024-01-10T10:30:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Booking last update date',
    example: '2024-01-10T10:30:00.000Z',
  })
  updated_at: string;
}

export class BookingsListResponseDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Total number of bookings',
    example: 25,
  })
  total_bookings: number;

  @ApiProperty({
    description: 'Total revenue from all bookings in cents',
    example: 125000,
  })
  total_revenue: number;

  @ApiProperty({
    description: 'List of all bookings',
    type: [BookingResponseDto],
  })
  bookings: BookingResponseDto[];
}
