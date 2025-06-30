import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  RoomsListResponseDto,
  RoomCalendarResponseDto,
} from './dto/room-response.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusResponseDto,
} from './dto/update-room-status.dto';

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

  @Get('calendar')
  @ApiOperation({
    summary: 'Get room calendar with bookings',
    description:
      'Get a calendar view of all rooms with their bookings for a specified time period (e.g., 7 days, 30 days, 60 days)',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'days',
    description:
      'Number of days to include in the calendar (e.g., 7 for 1 week, 30 for 1 month)',
    required: false,
    type: 'number',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Room calendar with bookings',
    type: RoomCalendarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  async getRoomCalendar(
    @Query('hotel_id') hotelId: string,
    @Query('days') days?: string,
  ): Promise<RoomCalendarResponseDto> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    // Default to 30 days if not specified
    const calendarDays = days ? parseInt(days, 10) : 30;

    // Validate days parameter
    if (isNaN(calendarDays) || calendarDays < 1 || calendarDays > 365) {
      throw new BadRequestException('days must be a number between 1 and 365');
    }

    return this.roomsService.getRoomCalendar(hotelId, calendarDays);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update room status',
    description: 'Update room status to available, out_of_service, or cleaning',
  })
  @ApiParam({
    name: 'id',
    description: 'Room UUID',
    type: 'string',
  })
  @ApiBody({
    type: UpdateRoomStatusDto,
    description: 'Room status update details',
  })
  @ApiResponse({
    status: 200,
    description: 'Room status updated successfully',
    type: RoomStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  async updateRoomStatus(
    @Param('id') roomId: string,
    @Body() updateRoomStatusDto: UpdateRoomStatusDto,
  ): Promise<RoomStatusResponseDto> {
    return this.roomsService.updateRoomStatus(roomId, updateRoomStatusDto);
  }
}
