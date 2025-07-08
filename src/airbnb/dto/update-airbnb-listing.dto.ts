import {
  IsString,
  IsUrl,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAirbnbListingDto {
  @ApiProperty({
    description: 'Room ID that this listing is for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  room_id?: string;

  @ApiProperty({
    description: 'Airbnb listing URL',
    example: 'https://www.airbnb.com/rooms/782682596976136912',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  listing_url?: string;

  @ApiProperty({
    description: 'Title of the Airbnb listing',
    example: 'Beautiful apartment in downtown',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Whether the listing is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
