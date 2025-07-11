import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';

export class RateRuleQueryDto {
  @ApiProperty({
    description: 'Filter by room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  room_id?: string;

  @ApiProperty({
    description: 'Filter by hotel ID (returns rate rules for all rooms in the hotel)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hotel_id?: string;

  @ApiProperty({
    description: 'Filter by source platform',
    example: 'website',
    required: false,
    enum: ['website', 'airbnb', 'booking.com'],
  })
  @IsOptional()
  @IsString()
  source?: string;
}