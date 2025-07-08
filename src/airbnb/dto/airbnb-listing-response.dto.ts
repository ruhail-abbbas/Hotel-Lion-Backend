import { ApiProperty } from '@nestjs/swagger';

export class AirbnbListingResponseDto {
  @ApiProperty({
    description: 'Listing ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Hotel ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  hotel_id: string;

  @ApiProperty({
    description: 'Room ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  room_id: string;

  @ApiProperty({
    description: 'Airbnb listing URL',
    example: 'https://www.airbnb.com/rooms/782682596976136912',
  })
  listing_url: string;

  @ApiProperty({
    description: 'Title of the Airbnb listing',
    example: 'Beautiful apartment in downtown',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Whether the listing is active',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-08T12:00:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-08T12:00:00Z',
  })
  updated_at: string;
}
