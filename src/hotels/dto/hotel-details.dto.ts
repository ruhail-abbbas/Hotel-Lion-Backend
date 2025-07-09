import { ApiProperty } from '@nestjs/swagger';

export class HotelUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'manager@hotel-lion.com',
  })
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'staff'],
    example: 'admin',
  })
  role: string;

  @ApiProperty({
    description: 'When the user was created',
    example: '2024-01-10T10:30:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'When the user was last updated',
    example: '2024-01-10T15:45:00.000Z',
  })
  updated_at: string;
}

export class HotelStatsDto {
  @ApiProperty({
    description: 'Total number of rooms in the hotel',
    example: 14,
  })
  total_rooms: number;

  @ApiProperty({
    description: 'Number of available rooms',
    example: 10,
  })
  available_rooms: number;

  @ApiProperty({
    description: 'Number of rooms out of service',
    example: 1,
  })
  out_of_service_rooms: number;

  @ApiProperty({
    description: 'Number of rooms being cleaned',
    example: 3,
  })
  cleaning_rooms: number;

  @ApiProperty({
    description: 'Total active bookings (pending + confirmed)',
    example: 25,
  })
  total_active_bookings: number;

  @ApiProperty({
    description: 'Total number of users associated with this hotel',
    example: 5,
  })
  total_users: number;
}

export class HotelDetailsResponseDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Hotel name',
    example: 'Hotel Lion',
  })
  name: string;

  @ApiProperty({
    description: 'Hotel location',
    example: 'Downtown City Center',
  })
  location: string;

  @ApiProperty({
    description: 'Hotel contact information',
    example: {
      phone: '+1234567890',
      email: 'info@hotel-lion.com',
      website: 'https://hotel-lion.com',
      currency: 'USD',
      tax_rate: 10.5,
    },
    nullable: true,
  })
  contact_info?: any;

  @ApiProperty({
    description: 'Hotel policies',
    example:
      'Check-in: 3:00 PM, Check-out: 11:00 AM. No smoking. Pets allowed with fee.',
    nullable: true,
  })
  policies?: string;

  @ApiProperty({
    description: 'Default check-in time',
    example: '15:00',
    nullable: true,
  })
  default_checkin_time?: string;

  @ApiProperty({
    description: 'Default check-out time',
    example: '11:00',
    nullable: true,
  })
  default_checkout_time?: string;

  @ApiProperty({
    description: 'When the hotel was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'When the hotel was last updated',
    example: '2024-01-10T15:45:00.000Z',
  })
  updated_at: string;

  @ApiProperty({
    description: 'All users associated with this hotel',
    type: [HotelUserDto],
  })
  users: HotelUserDto[];

  @ApiProperty({
    description: 'Hotel managers (users with admin role)',
    type: [HotelUserDto],
  })
  managers: HotelUserDto[];

  @ApiProperty({
    description: 'Hotel staff (users with staff role)',
    type: [HotelUserDto],
  })
  staff: HotelUserDto[];

  @ApiProperty({
    description: 'Hotel statistics summary',
    type: HotelStatsDto,
  })
  stats: HotelStatsDto;
}
