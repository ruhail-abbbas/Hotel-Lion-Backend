import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRateRuleDto {
  @ApiProperty({
    description: 'Start date for this rate rule (YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'End date for this rate rule (YYYY-MM-DD)',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    description: 'Premium amount in Euros to add to base price (can be negative for discounts)',
    example: 25.00,
    required: false,
    minimum: -999999,
    maximum: 999999,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-999999, { message: 'price_per_night must be at least -999999 Euros' })
  @Max(999999, { message: 'price_per_night must not exceed 999999 Euros' })
  @Type(() => Number)
  price_per_night?: number;

  @ApiProperty({
    description: 'Minimum nights required for this rate rule',
    example: 2,
    required: false,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'min_stay_nights must be at least 1' })
  @Max(365, { message: 'min_stay_nights must not exceed 365' })
  min_stay_nights?: number;

  @ApiProperty({
    description: 'Array of days of the week this rule applies to (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: [5, 6],
    type: [Number],
    required: false,
    minItems: 1,
    maxItems: 7,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'day_of_week must contain at least 1 day' })
  @ArrayMaxSize(7, { message: 'day_of_week must not contain more than 7 days' })
  @IsInt({ each: true })
  @Min(0, { each: true, message: 'each day must be between 0 and 6' })
  @Max(6, { each: true, message: 'each day must be between 0 and 6' })
  @ArrayUnique({ message: 'day_of_week must not contain duplicate days' })
  day_of_week?: number[];

  @ApiProperty({
    description: 'Source platform this rate rule applies to',
    example: 'website',
    required: false,
    enum: ['website', 'airbnb', 'booking.com'],
  })
  @IsOptional()
  @IsString()
  source?: string;
}