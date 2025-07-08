import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AirbnbCalendarRequestDto {
  @ApiProperty({
    description: 'Airbnb listing URL',
    example: 'https://www.airbnb.com/rooms/782682596976136912',
  })
  @IsString()
  @IsUrl()
  url: string;
}
