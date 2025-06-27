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
    description: 'Base price per night in cents',
    example: 12000,
  })
  base_price: number;

  @ApiProperty({
    description: 'Base price per night in dollars',
    example: 120.0,
  })
  base_price_dollars: number;

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
