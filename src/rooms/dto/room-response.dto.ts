import { ApiProperty } from '@nestjs/swagger';

export class RoomPhotoDto {
  @ApiProperty({
    description: 'Photo ID',
    example: 'photo-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/images/room-y1a-1.jpg',
  })
  image_url: string;

  @ApiProperty({
    description: 'Sort order for displaying photos',
    example: 1,
  })
  sort_order: number;
}

export class RoomListDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  name: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Cozy single room with city view and modern amenities',
  })
  description: string;

  @ApiProperty({
    description: 'Room size in square meters',
    example: 25,
  })
  size_sqm: number;

  @ApiProperty({
    description: 'Bed setup description',
    example: '1 Queen Bed',
  })
  bed_setup: string;

  @ApiProperty({
    description: 'Base price per night in Euros (for website/direct bookings)',
    example: 120.00,
  })
  base_price: number;

  @ApiProperty({
    description: 'Airbnb price per night in Euros',
    example: 130.00,
    nullable: true,
  })
  airbnb_price?: number;

  @ApiProperty({
    description: 'Booking.com price per night in Euros',
    example: 140.00,
    nullable: true,
  })
  booking_com_price?: number;

  @ApiProperty({
    description: 'Maximum guest capacity',
    example: 2,
  })
  max_capacity: number;

  @ApiProperty({
    description: 'Room amenities (JSON data as stored in database)',
    example: [
      'WiFi',
      'Air Conditioning',
      'TV',
      'Private Bathroom',
      'Mini Fridge',
    ],
  })
  amenities: any;

  @ApiProperty({
    description: 'Pet fee in Euros',
    example: 25.00,
    nullable: true,
  })
  pet_fee?: number;

  @ApiProperty({
    description: 'Minimum nights required for booking',
    example: 2,
    nullable: true,
  })
  minimum_nights?: number;

  @ApiProperty({
    description: 'Cleaning fee in Euros',
    example: 50.00,
    nullable: true,
  })
  cleaning_fee?: number;

  @ApiProperty({
    description: 'Room photos',
    type: [RoomPhotoDto],
  })
  photos: RoomPhotoDto[];
}

export class RoomsListResponseDto {
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
    description: 'List of all rooms',
    type: [RoomListDto],
  })
  rooms: RoomListDto[];
}

export class BookingDto {
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
    description: 'Guest name',
    example: 'John Doe',
  })
  guest_name: string;

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
  })
  status: string;

  @ApiProperty({
    description: 'Total cost in Euros',
    example: 360.00,
  })
  total_cost: number;
}

export class AirbnbAvailabilityDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-01-08',
  })
  date: string;

  @ApiProperty({
    description: 'Whether the date is available on Airbnb',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Whether the date is available for check-in on Airbnb',
    example: true,
  })
  availableForCheckin: boolean;

  @ApiProperty({
    description: 'Whether the date is available for check-out on Airbnb',
    example: true,
  })
  availableForCheckout: boolean;
}

export class RoomCalendarDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  name: string;

  @ApiProperty({
    description: 'Room status',
    example: 'available',
  })
  status: string;

  @ApiProperty({
    description: 'Room bookings within the date range',
    type: [BookingDto],
  })
  bookings: BookingDto[];

  @ApiProperty({
    description:
      'Airbnb availability data for this room (if Airbnb listings exist)',
    type: [AirbnbAvailabilityDto],
    required: false,
  })
  airbnb_availability?: AirbnbAvailabilityDto[];
}

export class RoomCalendarResponseDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Start date of the calendar period',
    example: '2024-01-01',
  })
  start_date: string;

  @ApiProperty({
    description: 'End date of the calendar period',
    example: '2024-01-31',
  })
  end_date: string;

  @ApiProperty({
    description: 'Number of days in the period',
    example: 30,
  })
  days: number;

  @ApiProperty({
    description: 'Total number of rooms',
    example: 14,
  })
  total_rooms: number;

  @ApiProperty({
    description: 'List of all rooms with their bookings',
    type: [RoomCalendarDto],
  })
  rooms: RoomCalendarDto[];
}

export class AvailableRoomDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  name: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Cozy single room with city view and modern amenities',
  })
  description: string;

  @ApiProperty({
    description: 'Room size in square meters',
    example: 25,
  })
  size_sqm: number;

  @ApiProperty({
    description: 'Bed setup description',
    example: '1 Queen Bed',
  })
  bed_setup: string;

  @ApiProperty({
    description: 'Base price per night in Euros (for website/direct bookings)',
    example: 120.00,
  })
  base_price: number;

  @ApiProperty({
    description: 'Airbnb price per night in Euros',
    example: 130.00,
    nullable: true,
  })
  airbnb_price?: number;

  @ApiProperty({
    description: 'Booking.com price per night in Euros',
    example: 140.00,
    nullable: true,
  })
  booking_com_price?: number;

  @ApiProperty({
    description: 'Total cost for the stay in Euros',
    example: 360.00,
  })
  total_cost: number;

  @ApiProperty({
    description: 'Number of nights',
    example: 3,
  })
  nights: number;

  @ApiProperty({
    description: 'Maximum guest capacity',
    example: 2,
  })
  max_capacity: number;

  @ApiProperty({
    description: 'Room amenities',
    example: [
      'WiFi',
      'Air Conditioning',
      'TV',
      'Private Bathroom',
      'Mini Fridge',
    ],
  })
  amenities: any;

  @ApiProperty({
    description: 'Pet fee in Euros',
    example: 25.00,
    nullable: true,
  })
  pet_fee?: number;

  @ApiProperty({
    description: 'Minimum nights required for booking',
    example: 2,
    nullable: true,
  })
  minimum_nights?: number;

  @ApiProperty({
    description: 'Cleaning fee in Euros',
    example: 50.00,
    nullable: true,
  })
  cleaning_fee?: number;

  @ApiProperty({
    description: 'Room photos',
    type: [RoomPhotoDto],
  })
  photos: RoomPhotoDto[];
}

export class RoomAvailabilityResponseDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  hotel_id: string;

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
    description: 'Number of guests',
    example: 2,
  })
  guests: number;

  @ApiProperty({
    description: 'Number of infants (under 2 years old)',
    example: 1,
  })
  infants: number;

  @ApiProperty({
    description: 'Number of nights',
    example: 3,
  })
  nights: number;

  @ApiProperty({
    description: 'Number of available rooms',
    example: 8,
  })
  available_rooms_count: number;

  @ApiProperty({
    description: 'List of available rooms with pricing',
    type: [AvailableRoomDto],
  })
  available_rooms: AvailableRoomDto[];
}
