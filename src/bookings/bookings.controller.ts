import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  BookingsListResponseDto,
  BookingResponseDto,
} from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all bookings',
    description:
      'Get a list of all bookings for a hotel with guest and room details',
  })
  @ApiQuery({
    name: 'hotel_id',
    description: 'Hotel UUID',
    required: true,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all bookings',
    type: BookingsListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  async getAllBookings(
    @Query('hotel_id') hotelId: string,
  ): Promise<BookingsListResponseDto> {
    if (!hotelId) {
      throw new BadRequestException('hotel_id is required');
    }

    return this.bookingsService.getAllBookings(hotelId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new booking',
    description:
      'Create a new booking with room availability validation and automatic reference number generation',
  })
  @ApiBody({
    type: CreateBookingDto,
    description: 'Booking details',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or room not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Room not available for selected dates',
  })
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBooking(createBookingDto);
  }
}
