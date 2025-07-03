import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import {
  BookingsListResponseDto,
  BookingResponseDto,
} from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private roomsService: RoomsService,
  ) {}

  async getAllBookings(hotelId: string): Promise<BookingsListResponseDto> {
    // Get all bookings for the hotel with room information
    const bookings = await this.prisma.booking.findMany({
      where: {
        room: {
          hotel_id: hotelId,
        },
      },
      include: {
        room: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform the data to match our DTO
    const bookingsList: BookingResponseDto[] = bookings.map((booking) => ({
      id: booking.id,
      reference_number: booking.reference_number,
      room_id: booking.room_id,
      room_name: booking.room.name,
      guest_name: booking.guest_name,
      guest_contact: booking.guest_contact || undefined,
      guest_email: booking.guest_email,
      check_in_date: booking.check_in_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      check_out_date: booking.check_out_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: booking.status,
      source: booking.source || undefined,
      total_cost: booking.total_cost,
      created_at: booking.created_at.toISOString(),
      updated_at: booking.updated_at.toISOString(),
    }));

    // Calculate total revenue from all bookings
    const totalRevenue = bookingsList.reduce(
      (sum, booking) => sum + booking.total_cost,
      0,
    );

    return {
      hotel_id: hotelId,
      total_bookings: bookingsList.length,
      total_revenue: totalRevenue,
      bookings: bookingsList,
    };
  }

  async createBooking(
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const {
      room_id,
      guest_name,
      guest_contact,
      guest_email,
      check_in_date,
      check_out_date,
      source,
    } = createBookingDto;

    // Convert string dates to Date objects
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);

    // Validate dates
    this.validateBookingDates(checkInDate, checkOutDate);

    // Check if room exists and get rate rules for pricing
    const room = await this.prisma.room.findUnique({
      where: { id: room_id },
      include: {
        rate_rules: {
          orderBy: {
            price_per_night: 'desc',
          },
        },
      },
    });

    if (!room) {
      throw new BadRequestException('Room not found');
    }

    // Calculate the total cost using the room pricing logic
    const { totalCost } = this.roomsService.calculateRoomPricing(
      room,
      checkInDate,
      checkOutDate,
    );

    // Check room availability
    await this.checkRoomAvailability(room_id, checkInDate, checkOutDate);

    // Generate unique reference number
    const referenceNumber = await this.generateBookingReference();

    // Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        room_id,
        reference_number: referenceNumber,
        guest_name,
        guest_contact: guest_contact || null,
        guest_email,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_cost: totalCost,
        source: source || null,
        status: 'pending',
      },
      include: {
        room: {
          select: {
            name: true,
          },
        },
      },
    });

    // Transform to response DTO
    return {
      id: booking.id,
      reference_number: booking.reference_number,
      room_id: booking.room_id,
      room_name: booking.room.name,
      guest_name: booking.guest_name,
      guest_contact: booking.guest_contact || undefined,
      guest_email: booking.guest_email,
      check_in_date: booking.check_in_date.toISOString().split('T')[0],
      check_out_date: booking.check_out_date.toISOString().split('T')[0],
      status: booking.status,
      source: booking.source || undefined,
      total_cost: booking.total_cost,
      created_at: booking.created_at.toISOString(),
      updated_at: booking.updated_at.toISOString(),
    };
  }

  private validateBookingDates(checkInDate: Date, checkOutDate: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if check-in date is not in the past
    if (checkInDate < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Check if check-out date is after check-in date
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // Check if booking is not too far in the future (optional: 2 years max)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(today.getFullYear() + 2);
    if (checkInDate > maxFutureDate) {
      throw new BadRequestException(
        'Check-in date cannot be more than 2 years in the future',
      );
    }
  }

  private async checkRoomAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void> {
    // Check for overlapping confirmed bookings
    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        room_id: roomId,
        status: {
          in: ['pending', 'confirmed'], // Exclude cancelled bookings
        },
        OR: [
          // Booking starts during the requested period
          {
            AND: [
              { check_in_date: { gte: checkInDate } },
              { check_in_date: { lt: checkOutDate } },
            ],
          },
          // Booking ends during the requested period
          {
            AND: [
              { check_out_date: { gt: checkInDate } },
              { check_out_date: { lte: checkOutDate } },
            ],
          },
          // Booking spans the entire requested period
          {
            AND: [
              { check_in_date: { lte: checkInDate } },
              { check_out_date: { gte: checkOutDate } },
            ],
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      throw new ConflictException(
        `Room is not available for the selected dates. Conflicting booking reference: ${overlappingBookings[0].reference_number}`,
      );
    }

    // Check for blocked dates
    const blockedDates = await this.prisma.blockedDate.findMany({
      where: {
        room_id: roomId,
        blocked_date: {
          gte: checkInDate,
          lt: checkOutDate,
        },
      },
    });

    if (blockedDates.length > 0) {
      throw new ConflictException(
        `Room is blocked for some of the selected dates. First blocked date: ${blockedDates[0].blocked_date.toISOString().split('T')[0]}`,
      );
    }
  }

  private async generateBookingReference(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `BK-${currentYear}-`;

    // Find the highest existing reference number for this year
    const lastBooking = await this.prisma.booking.findFirst({
      where: {
        reference_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        reference_number: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastBooking) {
      const lastNumber = parseInt(
        lastBooking.reference_number.replace(prefix, ''),
        10,
      );
      nextNumber = lastNumber + 1;
    }

    // Pad with zeros to make it 4 digits
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  }
}
