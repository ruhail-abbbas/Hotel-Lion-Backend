import { ApiProperty } from '@nestjs/swagger';

export class CalendarDayDto {
  @ApiProperty({
    description: 'Room is Available or not',
    example: 'true',
  })
  available: boolean;

  @ApiProperty({
    description: 'Concerned Date',
    example: '2025-07-02',
  })
  date: string;

  @ApiProperty({
    description: 'Whether the date is available for check-in',
    example: true,
  })
  availableForCheckin: boolean;

  @ApiProperty({
    description: 'Whether the date is available for check-out',
    example: true,
  })
  availableForCheckout: boolean;
}

export class AirbnbCalendarResponseDto {
  @ApiProperty({
    description: 'Airbnb listing ID',
    example: '782682596976136912',
  })
  listingId: string;

  @ApiProperty({
    description: 'Calendar availability data',
    type: [CalendarDayDto],
  })
  calendar: CalendarDayDto[];

  @ApiProperty({
    description: 'Data extraction timestamp',
    example: '2025-01-08T12:00:00Z',
  })
  extractedAt: string;
}
