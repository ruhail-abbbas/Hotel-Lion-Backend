import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RoomsListResponseDto,
  RoomListDto,
  RoomCalendarResponseDto,
  RoomCalendarDto,
  BookingDto,
  RoomAvailabilityResponseDto,
  AvailableRoomDto,
} from './dto/room-response.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusResponseDto,
  RoomStatus,
} from './dto/update-room-status.dto';
import { EditRoomDto, EditRoomResponseDto } from './dto/edit-room.dto';

// Define types for room with rate rules
type RoomWithRateRules = {
  id: string;
  base_price: number;
  rate_rules: {
    start_date: Date;
    end_date: Date;
    price_per_night: number;
    day_of_week: number[];
  }[];
};

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async getAllRooms(hotelId: string): Promise<RoomsListResponseDto> {
    // Get all rooms with their photos and rate rules, ordered by name
    const rooms = await this.prisma.room.findMany({
      where: {
        hotel_id: hotelId,
        status: 'available', // Only show available rooms for booking
      },
      include: {
        room_photos: {
          orderBy: {
            sort_order: 'asc',
          },
        },
        rate_rules: {
          orderBy: {
            price_per_night: 'desc', // Higher prices first for proper priority
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data to match our DTO with rate rule pricing
    const roomsList: RoomListDto[] = rooms.map((room) => {
      // Calculate current base price from rate rules (use today's rate)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const { totalCost } = this.calculateRoomPricing(room, today, tomorrow);
      // For getAllRooms, we want today's rate, not the lowest rate
      const todayPrice = totalCost; // Since it's just one night (today to tomorrow)

      return {
        id: room.id,
        name: room.name,
        description: room.description || '',
        size_sqm: room.size_sqm || 0,
        bed_setup: room.bed_setup || '',
        base_price: todayPrice,
        max_capacity: room.max_capacity,
        amenities: room.amenities || [],
        pet_fee: room.pet_fee ?? undefined,
        minimum_nights: room.minimum_nights ?? undefined,
        cleaning_fee: room.cleaning_fee ?? undefined,
        photos: room.room_photos.map((photo) => ({
          id: photo.id,
          image_url: photo.image_url,
          sort_order: photo.sort_order,
        })),
      };
    });

    return {
      hotel_id: hotelId,
      total_rooms: roomsList.length,
      rooms: roomsList,
    };
  }

  async getRoomCalendar(
    hotelId: string,
    days: number,
  ): Promise<RoomCalendarResponseDto> {
    // Calculate date range
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days - 1);
    endDate.setHours(23, 59, 59, 999); // End of the last day

    // Get all rooms for the hotel
    const rooms = await this.prisma.room.findMany({
      where: {
        hotel_id: hotelId,
      },
      include: {
        bookings: {
          where: {
            OR: [
              // Bookings that start within the date range
              {
                AND: [
                  { check_in_date: { gte: startDate } },
                  { check_in_date: { lte: endDate } },
                ],
              },
              // Bookings that end within the date range
              {
                AND: [
                  { check_out_date: { gte: startDate } },
                  { check_out_date: { lte: endDate } },
                ],
              },
              // Bookings that span the entire date range
              {
                AND: [
                  { check_in_date: { lte: startDate } },
                  { check_out_date: { gte: endDate } },
                ],
              },
            ],
          },
          orderBy: {
            check_in_date: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data to match our DTO
    const roomsCalendar: RoomCalendarDto[] = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      bookings: room.bookings.map(
        (booking): BookingDto => ({
          id: booking.id,
          reference_number: booking.reference_number,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          check_in_date: booking.check_in_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          check_out_date: booking.check_out_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          status: booking.status,
          total_cost: booking.total_cost,
        }),
      ),
    }));

    return {
      hotel_id: hotelId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      days: days,
      total_rooms: roomsCalendar.length,
      rooms: roomsCalendar,
    };
  }

  async updateRoomStatus(
    roomId: string,
    updateRoomStatusDto: UpdateRoomStatusDto,
  ): Promise<RoomStatusResponseDto> {
    const { status, notes } = updateRoomStatusDto;

    // Check if room exists and get current status
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Store previous status for response
    const previousStatus = room.status as RoomStatus;

    // Update room status
    const updatedRoom = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        status,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        status: true,
        updated_at: true,
      },
    });

    // If room is being put out of service or for cleaning, optionally log this action
    // (In a real app, you might want to create an audit log entry here)

    return {
      id: updatedRoom.id,
      name: updatedRoom.name,
      previous_status: previousStatus,
      new_status: updatedRoom.status as RoomStatus,
      notes: notes,
      updated_at: updatedRoom.updated_at.toISOString(),
    };
  }

  async searchAvailableRooms(
    hotelId: string,
    checkInDate: string,
    checkOutDate: string,
    guests: number,
    infants: number,
  ): Promise<RoomAvailabilityResponseDto> {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Calculate number of nights
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get all rooms for the hotel that can accommodate the guests and are available for booking
    // Note: Infants typically don't count toward room capacity, but we include them in the response
    const allRooms = await this.prisma.room.findMany({
      where: {
        hotel_id: hotelId,
        status: 'available', // Only rooms that are not out of service or cleaning
        max_capacity: {
          gte: guests, // Room must accommodate the number of guests (infants don't count toward capacity)
        },
      },
      include: {
        room_photos: {
          orderBy: {
            sort_order: 'asc',
          },
        },
        rate_rules: {
          orderBy: {
            price_per_night: 'desc', // Higher prices first for proper priority
          },
        },
        bookings: {
          where: {
            status: {
              in: ['confirmed', 'pending'], // Check for confirmed and pending bookings
            },
            OR: [
              // Bookings that start during the requested period
              {
                AND: [
                  { check_in_date: { gte: checkIn } },
                  { check_in_date: { lt: checkOut } },
                ],
              },
              // Bookings that end during the requested period
              {
                AND: [
                  { check_out_date: { gt: checkIn } },
                  { check_out_date: { lte: checkOut } },
                ],
              },
              // Bookings that span the entire requested period
              {
                AND: [
                  { check_in_date: { lte: checkIn } },
                  { check_out_date: { gte: checkOut } },
                ],
              },
            ],
          },
        },
      },
    });

    // Filter out rooms that have conflicting bookings or don't meet minimum nights requirement
    const availableRooms = allRooms.filter((room) => {
      // Check for booking conflicts
      if (room.bookings.length > 0) {
        return false;
      }

      // Check minimum nights requirement
      if (room.minimum_nights && nights < room.minimum_nights) {
        return false;
      }

      return true;
    });

    // Transform to response DTOs with proper pricing from rate rules
    const availableRoomDtos: AvailableRoomDto[] = [];

    for (const room of availableRooms) {
      const { totalCost, basePrice } = this.calculateRoomPricing(
        room,
        checkIn,
        checkOut,
      );

      availableRoomDtos.push({
        id: room.id,
        name: room.name,
        description: room.description || '',
        size_sqm: room.size_sqm || 0,
        bed_setup: room.bed_setup || '',
        base_price: basePrice,
        total_cost: totalCost,
        nights: nights,
        max_capacity: room.max_capacity,
        amenities: room.amenities || [],
        pet_fee: room.pet_fee ?? undefined,
        minimum_nights: room.minimum_nights ?? undefined,
        cleaning_fee: room.cleaning_fee ?? undefined,
        photos: room.room_photos.map((photo) => ({
          id: photo.id,
          image_url: photo.image_url,
          sort_order: photo.sort_order,
        })),
      });
    }

    // Sort by total cost ascending
    availableRoomDtos.sort((a, b) => a.total_cost - b.total_cost);

    return {
      hotel_id: hotelId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      guests: guests,
      infants: infants,
      nights: nights,
      available_rooms_count: availableRoomDtos.length,
      available_rooms: availableRoomDtos,
    };
  }

  /**
   * Calculate room pricing based on rate rules for the given date range
   */
  public calculateRoomPricing(
    room: RoomWithRateRules,
    checkIn: Date,
    checkOut: Date,
  ): { totalCost: number; basePrice: number } {
    let totalCost = 0;
    let lowestNightlyRate = Infinity;

    // If no rate rules are available, fall back to base_price
    if (!room.rate_rules || room.rate_rules.length === 0) {
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        totalCost: room.base_price * nights,
        basePrice: room.base_price,
      };
    }

    // Filter applicable rate rules based on date range
    const applicableRateRules = room.rate_rules.filter((rateRule) => {
      const ruleStart = new Date(rateRule.start_date);
      const ruleEnd = new Date(rateRule.end_date);

      return ruleStart <= checkOut && ruleEnd >= checkIn;
    });

    // Iterate through each night of the stay
    const currentDate = new Date(checkIn);
    while (currentDate < checkOut) {
      const dayOfWeek = currentDate.getDay();

      let applicableRate = room.base_price; // Default fallback

      // First, apply any general rule (all days) - add premium to base price
      const generalRule = applicableRateRules.find(
        (rule) => rule.day_of_week.length === 7,
      );
      if (generalRule) {
        applicableRate = room.base_price + generalRule.price_per_night;
      }

      // Then, check for day-specific rules (they override general rules)
      const daySpecificRules = applicableRateRules.filter(
        (rule) =>
          rule.day_of_week.length < 7 && rule.day_of_week.includes(dayOfWeek),
      );

      if (daySpecificRules.length > 0) {
        // Use the highest premium among day-specific rules (weekend premiums)
        const highestPremium = Math.max(
          ...daySpecificRules.map((rule) => rule.price_per_night),
        );
        applicableRate = room.base_price + highestPremium;
      }

      totalCost += applicableRate;
      if (applicableRate < lowestNightlyRate) {
        lowestNightlyRate = applicableRate;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return {
      totalCost,
      basePrice:
        lowestNightlyRate === Infinity ? room.base_price : lowestNightlyRate,
    };
  }

  async editRoom(
    roomId: string,
    editRoomDto: EditRoomDto,
  ): Promise<EditRoomResponseDto> {
    // Check if room exists
    const existingRoom = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      throw new NotFoundException('Room not found');
    }

    // If name is being updated, check for uniqueness within the hotel
    if (editRoomDto.name && editRoomDto.name !== existingRoom.name) {
      const roomWithSameName = await this.prisma.room.findFirst({
        where: {
          hotel_id: existingRoom.hotel_id,
          name: editRoomDto.name,
          id: { not: roomId }, // Exclude current room
        },
      });

      if (roomWithSameName) {
        throw new BadRequestException(
          `A room with the name '${editRoomDto.name}' already exists in this hotel`,
        );
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: {
      name?: string;
      description?: string;
      size_sqm?: number;
      bed_setup?: string;
      base_price?: number;
      max_capacity?: number;
      status?: 'available' | 'out_of_service' | 'cleaning';
      amenities?: string[];
      pet_fee?: number;
      minimum_nights?: number;
      cleaning_fee?: number;
    } = {};

    if (editRoomDto.name !== undefined) updateData.name = editRoomDto.name;
    if (editRoomDto.description !== undefined)
      updateData.description = editRoomDto.description;
    if (editRoomDto.size_sqm !== undefined)
      updateData.size_sqm = editRoomDto.size_sqm;
    if (editRoomDto.bed_setup !== undefined)
      updateData.bed_setup = editRoomDto.bed_setup;
    if (editRoomDto.base_price !== undefined)
      updateData.base_price = editRoomDto.base_price;
    if (editRoomDto.max_capacity !== undefined)
      updateData.max_capacity = editRoomDto.max_capacity;
    if (editRoomDto.status !== undefined)
      updateData.status = editRoomDto.status;
    if (editRoomDto.amenities !== undefined)
      updateData.amenities = editRoomDto.amenities;
    if (editRoomDto.pet_fee !== undefined)
      updateData.pet_fee = editRoomDto.pet_fee;
    if (editRoomDto.minimum_nights !== undefined)
      updateData.minimum_nights = editRoomDto.minimum_nights;
    if (editRoomDto.cleaning_fee !== undefined)
      updateData.cleaning_fee = editRoomDto.cleaning_fee;

    // Update the room
    const updatedRoom = await this.prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    // Return formatted response
    return {
      id: updatedRoom.id,
      name: updatedRoom.name,
      description: updatedRoom.description || '',
      size_sqm: updatedRoom.size_sqm || 0,
      bed_setup: updatedRoom.bed_setup || '',
      base_price: updatedRoom.base_price,
      max_capacity: updatedRoom.max_capacity,
      status: updatedRoom.status,
      amenities: (updatedRoom.amenities as string[]) || [],
      pet_fee: updatedRoom.pet_fee ?? undefined,
      minimum_nights: updatedRoom.minimum_nights ?? undefined,
      cleaning_fee: updatedRoom.cleaning_fee ?? undefined,
      updated_at: updatedRoom.updated_at.toISOString(),
    };
  }

  async deleteRoom(roomId: string): Promise<{ message: string }> {
    // Check if room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['pending', 'confirmed'],
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if room has active bookings
    if (room.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete room with active bookings. Please cancel or complete all bookings first.',
      );
    }

    // Delete the room (CASCADE will handle related records like photos, rate_rules, etc.)
    await this.prisma.room.delete({
      where: { id: roomId },
    });

    return {
      message: `Room ${room.name} has been successfully deleted`,
    };
  }
}
