import {
  Controller,
  Get,
  Patch,
  Delete,
  Put,
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
  RoomAvailabilityResponseDto,
} from './dto/room-response.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusResponseDto,
} from './dto/update-room-status.dto';
import { EditRoomDto, EditRoomResponseDto } from './dto/edit-room.dto';

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

  @Get('search')
  @ApiOperation({
    summary: 'Search available rooms',
    description:
      'Search for available rooms based on check-in/check-out dates, hotel, and number of guests',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'check_in_date',
    description: 'Check-in date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-15',
  })
  @ApiQuery({
    name: 'check_out_date',
    description: 'Check-out date (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-18',
  })
  @ApiQuery({
    name: 'guests',
    description: 'Number of guests',
    required: true,
    type: 'number',
    example: 2,
  })
  @ApiQuery({
    name: 'infants',
    description: 'Number of infants (under 2 years old)',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Available rooms found',
    type: RoomAvailabilityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or dates',
  })
  async searchAvailableRooms(
    @Query('hotel_id') hotelId: string,
    @Query('check_in_date') checkInDate: string,
    @Query('check_out_date') checkOutDate: string,
    @Query('guests') guests: string,
    @Query('infants') infants?: string,
  ): Promise<RoomAvailabilityResponseDto> {
    // Validate required parameters
    if (!hotelId || !checkInDate || !checkOutDate || !guests) {
      throw new BadRequestException(
        'hotel_id, check_in_date, check_out_date, and guests are required',
      );
    }

    // Validate and parse guests number
    const guestCount = parseInt(guests, 10);
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 10) {
      throw new BadRequestException('guests must be a number between 1 and 10');
    }

    // Validate and parse infants number (optional, defaults to 0)
    const infantCount = infants ? parseInt(infants, 10) : 0;
    if (
      infants !== undefined &&
      (isNaN(infantCount) || infantCount < 0 || infantCount > 5)
    ) {
      throw new BadRequestException('infants must be a number between 0 and 5');
    }

    // Validate date formats
    const checkInRegex = /^\d{4}-\d{2}-\d{2}$/;
    const checkOutRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!checkInRegex.test(checkInDate) || !checkOutRegex.test(checkOutDate)) {
      throw new BadRequestException('Dates must be in YYYY-MM-DD format');
    }

    // Parse dates and validate logical constraints
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // Limit search to reasonable timeframe (e.g., max 30 days)
    const maxStayDays = 30;
    const stayDays = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (stayDays > maxStayDays) {
      throw new BadRequestException(
        `Maximum stay duration is ${maxStayDays} days`,
      );
    }

    return this.roomsService.searchAvailableRooms(
      hotelId,
      checkInDate,
      checkOutDate,
      guestCount,
      infantCount,
    );
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

  @Put(':id')
  @ApiOperation({
    summary: 'Edit a room',
    description:
      'Update room details such as name, description, price, capacity, status, and amenities.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room UUID',
    type: 'string',
  })
  @ApiBody({
    type: EditRoomDto,
    description: 'Room update details',
  })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    type: EditRoomResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or room name already exists',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  async editRoom(
    @Param('id') roomId: string,
    @Body() editRoomDto: EditRoomDto,
  ): Promise<EditRoomResponseDto> {
    return this.roomsService.editRoom(roomId, editRoomDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a room',
    description:
      'Delete a room from the hotel. Cannot delete rooms with active bookings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Room Y1A has been successfully deleted',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete room with active bookings',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  async deleteRoom(@Param('id') roomId: string): Promise<{ message: string }> {
    return this.roomsService.deleteRoom(roomId);
  }
}
