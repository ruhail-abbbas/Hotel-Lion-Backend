import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomsListResponseDto } from './dto/room-response.dto';

@ApiTags('Rooms')
@Controller('api/v1/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all available rooms',
    description:
      'Get a list of all available rooms for booking with details and photos',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available rooms',
    type: RoomsListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  async getAllRooms(
    @Query('hotel_id') hotelId: string,
  ): Promise<RoomsListResponseDto> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    return this.roomsService.getAllRooms(hotelId);
  }
}
