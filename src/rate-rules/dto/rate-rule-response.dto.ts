import { ApiProperty } from '@nestjs/swagger';

export class RateRuleResponseDto {
  @ApiProperty({
    description: 'Rate rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Room ID that this rate rule applies to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  room_id: string;

  @ApiProperty({
    description: 'Start date for this rate rule',
    example: '2025-01-01',
  })
  start_date: string;

  @ApiProperty({
    description: 'End date for this rate rule',
    example: '2025-12-31',
  })
  end_date: string;

  @ApiProperty({
    description: 'Premium amount in Euros to add to base price',
    example: 25.00,
  })
  price_per_night: number;

  @ApiProperty({
    description: 'Minimum nights required for this rate rule',
    example: 2,
    nullable: true,
  })
  min_stay_nights?: number;

  @ApiProperty({
    description: 'Array of days of the week this rule applies to (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: [5, 6],
    type: [Number],
  })
  day_of_week: number[];

  @ApiProperty({
    description: 'Source platform this rate rule applies to',
    example: 'website',
    nullable: true,
  })
  source?: string;
}

export class RateRuleListResponseDto {
  @ApiProperty({
    description: 'Total number of rate rules',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'List of rate rules',
    type: [RateRuleResponseDto],
  })
  rate_rules: RateRuleResponseDto[];
}