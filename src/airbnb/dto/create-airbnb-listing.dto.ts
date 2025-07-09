import { IsString, IsUrl, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAirbnbListingDto {
  @ApiProperty({
    description: 'Hotel ID that this listing belongs to',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  @IsUUID()
  hotel_id: string;

  @ApiProperty({
    description: 'Room ID that this listing is for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsUUID()
  room_id: string;

  @ApiProperty({
    description: 'Airbnb listing URL',
    example: 'https://www.airbnb.com/rooms/782682596976136912',
  })
  @IsString()
  @IsUrl()
  listing_url: string;

  @ApiProperty({
    description: 'Title of the Airbnb listing',
    example: 'Beautiful apartment in downtown',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;
}
