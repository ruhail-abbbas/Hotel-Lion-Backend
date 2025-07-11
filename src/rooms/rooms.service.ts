import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AirbnbService } from '../airbnb/airbnb.service';
import { PerformanceService } from '../monitoring/performance.service';
import {
  RoomsListResponseDto,
  RoomListDto,
  RoomCalendarResponseDto,
  RoomCalendarDto,
  BookingDto,
  RoomAvailabilityResponseDto,
  AvailableRoomDto,
  AirbnbAvailabilityDto,
} from './dto/room-response.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusResponseDto,
  RoomStatus,
} from './dto/update-room-status.dto';
import { EditRoomDto, EditRoomResponseDto } from './dto/edit-room.dto';
import { CreateRoomDto, CreateRoomResponseDto } from './dto/create-room.dto';
import {
  UploadRoomImageDto,
  UpdateRoomImageOrderDto,
  RoomImageUploadResponseDto,
} from './dto/upload-room-image.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

// Define types for room with rate rules
type RoomWithRateRules = {
  id: string;
  base_price: number | { toString(): string }; // Allow Decimal from Prisma
  airbnb_price?: number | { toString(): string } | null; // Allow Decimal from Prisma
  booking_com_price?: number | { toString(): string } | null; // Allow Decimal from Prisma
  rate_rules: {
    start_date: Date;
    end_date: Date;
    price_per_night: number | { toString(): string }; // Allow Decimal from Prisma
    day_of_week: number[];
  }[];
};

// Define type for room with bookings (for calendar)
type RoomWithBookings = {
  id: string;
  name: string;
  status: string;
  bookings: {
    id: string;
    reference_number: string;
    guest_name: string;
    guest_email: string;
    check_in_date: Date;
    check_out_date: Date;
    status: string;
    total_cost: number | { toString(): string };
  }[];
};

// Define type for room with Airbnb data
type RoomWithAirbnb = RoomWithBookings & {
  airbnb_availability?: AirbnbAvailabilityDto[];
};

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private prisma: PrismaService,
    private airbnbService: AirbnbService,
    private performanceService: PerformanceService,
  ) {}

  private parseDecimalToFloat(value: number | { toString(): string }): number {
    return typeof value === 'number' ? value : parseFloat(value.toString());
  }

  async createRoom(
    createRoomDto: CreateRoomDto,
    files?: Express.Multer.File[],
  ): Promise<CreateRoomResponseDto> {
    // Check if hotel exists
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: createRoomDto.hotel_id },
    });

    if (!hotel) {
      throw new NotFoundException(
        `Hotel with ID ${createRoomDto.hotel_id} not found`,
      );
    }

    // Check if room name is unique within the hotel
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        hotel_id: createRoomDto.hotel_id,
        name: createRoomDto.name,
      },
    });

    if (existingRoom) {
      throw new BadRequestException(
        `A room with the name '${createRoomDto.name}' already exists in this hotel`,
      );
    }

    try {
      // Use Prisma transaction for atomic operation
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the room
        const room = await prisma.room.create({
          data: {
            hotel_id: createRoomDto.hotel_id,
            name: createRoomDto.name,
            description: createRoomDto.description || '',
            size_sqm: createRoomDto.size_sqm || 0,
            bed_setup: createRoomDto.bed_setup || '',
            base_price: createRoomDto.base_price,
            airbnb_price: createRoomDto.airbnb_price,
            booking_com_price: createRoomDto.booking_com_price,
            max_capacity: createRoomDto.max_capacity,
            status: createRoomDto.status || 'available',
            amenities: createRoomDto.amenities || [],
            pet_fee: createRoomDto.pet_fee,
            minimum_nights: createRoomDto.minimum_nights,
            cleaning_fee: createRoomDto.cleaning_fee,
          },
        });

        // Create room photos if files are provided
        const imageUrls: string[] = [];
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageUrl = `/uploads/rooms/${file.filename}`;

            await prisma.roomPhoto.create({
              data: {
                room_id: room.id,
                image_url: imageUrl,
                sort_order: i + 1,
              },
            });

            imageUrls.push(imageUrl);
          }
        }

        return { room, imageUrls };
      });

      this.logger.log(
        `Created room ${result.room.id} with ${result.imageUrls.length} images`,
      );

      return {
        id: result.room.id,
        hotel_id: result.room.hotel_id,
        name: result.room.name,
        description: result.room.description || '',
        size_sqm: result.room.size_sqm || 0,
        bed_setup: result.room.bed_setup || '',
        base_price: parseFloat(result.room.base_price.toString()),
        airbnb_price: result.room.airbnb_price
          ? parseFloat(result.room.airbnb_price.toString())
          : undefined,
        booking_com_price: result.room.booking_com_price
          ? parseFloat(result.room.booking_com_price.toString())
          : undefined,
        max_capacity: result.room.max_capacity,
        status: result.room.status,
        amenities: (result.room.amenities as string[]) || [],
        pet_fee: result.room.pet_fee
          ? parseFloat(result.room.pet_fee.toString())
          : undefined,
        minimum_nights: result.room.minimum_nights ?? undefined,
        cleaning_fee: result.room.cleaning_fee
          ? parseFloat(result.room.cleaning_fee.toString())
          : undefined,
        image_urls: result.imageUrls,
        created_at: result.room.created_at.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create room:', error);
      throw new BadRequestException('Failed to create room');
    }
  }

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

      const { totalCost } = this.calculateRoomPricing(
        {
          id: room.id,
          base_price: this.parseDecimalToFloat(room.base_price),
          airbnb_price: room.airbnb_price !== null && room.airbnb_price !== undefined
            ? this.parseDecimalToFloat(room.airbnb_price)
            : null,
          booking_com_price: room.booking_com_price !== null && room.booking_com_price !== undefined
            ? this.parseDecimalToFloat(room.booking_com_price)
            : null,
          rate_rules: room.rate_rules.map((rule) => ({
            ...rule,
            price_per_night: this.parseDecimalToFloat(rule.price_per_night),
          })),
        },
        today,
        tomorrow,
      );
      // For getAllRooms, we want today's rate, not the lowest rate
      const todayPrice = totalCost; // Since it's just one night (today to tomorrow)

      return {
        id: room.id,
        name: room.name,
        description: room.description || '',
        size_sqm: room.size_sqm || 0,
        bed_setup: room.bed_setup || '',
        base_price: todayPrice,
        airbnb_price: room.airbnb_price
          ? this.parseDecimalToFloat(room.airbnb_price)
          : undefined,
        booking_com_price: room.booking_com_price
          ? this.parseDecimalToFloat(room.booking_com_price)
          : undefined,
        max_capacity: room.max_capacity,
        amenities: room.amenities || [],
        pet_fee: room.pet_fee ? parseFloat(room.pet_fee.toString()) : undefined,
        minimum_nights: room.minimum_nights ?? undefined,
        cleaning_fee: room.cleaning_fee
          ? parseFloat(room.cleaning_fee.toString())
          : undefined,
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

    // Fetch Airbnb availability data for all rooms
    const roomsWithAirbnb = await this.fetchAirbnbDataForRooms(
      rooms,
      startDate,
      endDate,
    );

    // Transform the data to match our DTO
    const roomsCalendar: RoomCalendarDto[] = roomsWithAirbnb.map((room) => ({
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
          total_cost: this.parseDecimalToFloat(booking.total_cost),
        }),
      ),
      airbnb_availability: room.airbnb_availability || [],
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

  private async fetchAirbnbDataForRooms(
    rooms: RoomWithBookings[],
    startDate: Date,
    endDate: Date,
  ): Promise<RoomWithAirbnb[]> {
    const roomsWithAirbnb = await Promise.all(
      rooms.map(async (room) => {
        try {
          // Get Airbnb listings for this room
          const airbnbListings = await this.airbnbService.getListingsByRoom(
            room.id,
          );

          if (airbnbListings.length === 0) {
            return { ...room, airbnb_availability: undefined };
          }

          // Fetch calendar data for the first active listing
          const activeListings = airbnbListings.filter(
            (listing) => listing.is_active,
          );
          if (activeListings.length === 0) {
            return { ...room, airbnb_availability: undefined };
          }

          const listing = activeListings[0]; // Use first active listing
          const calendarResponse = await this.airbnbService.getCalendarData({
            url: listing.listing_url,
          });

          // Filter calendar data to match the date range and format it
          const airbnbAvailability: AirbnbAvailabilityDto[] =
            calendarResponse.calendar
              .filter((day) => {
                const dayDate = new Date(day.date);
                return dayDate >= startDate && dayDate <= endDate;
              })
              .map((day) => ({
                date: day.date,
                available: day.available,
                availableForCheckin: day.availableForCheckin,
                availableForCheckout: day.availableForCheckout,
              }));

          return { ...room, airbnb_availability: airbnbAvailability };
        } catch (error) {
          this.logger.warn(
            `Failed to fetch Airbnb data for room ${room.id}:`,
            error,
          );
          return { ...room, airbnb_availability: undefined };
        }
      }),
    );

    return roomsWithAirbnb;
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
    platform?: string,
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
        {
          id: room.id,
          base_price: this.parseDecimalToFloat(room.base_price),
          airbnb_price: room.airbnb_price !== null && room.airbnb_price !== undefined
            ? this.parseDecimalToFloat(room.airbnb_price)
            : null,
          booking_com_price: room.booking_com_price !== null && room.booking_com_price !== undefined
            ? this.parseDecimalToFloat(room.booking_com_price)
            : null,
          rate_rules: room.rate_rules.map((rule) => ({
            ...rule,
            price_per_night: this.parseDecimalToFloat(rule.price_per_night),
          })),
        },
        checkIn,
        checkOut,
        platform,
      );

      // Get platform-specific price for display
      const platformPrice = this.getPlatformPrice(
        {
          base_price: this.parseDecimalToFloat(room.base_price),
          airbnb_price: room.airbnb_price !== null && room.airbnb_price !== undefined
            ? this.parseDecimalToFloat(room.airbnb_price)
            : null,
          booking_com_price: room.booking_com_price !== null && room.booking_com_price !== undefined
            ? this.parseDecimalToFloat(room.booking_com_price)
            : null,
        },
        platform,
      );

      availableRoomDtos.push({
        id: room.id,
        name: room.name,
        description: room.description || '',
        size_sqm: room.size_sqm || 0,
        bed_setup: room.bed_setup || '',
        base_price: platform ? platformPrice : basePrice,
        airbnb_price: room.airbnb_price
          ? this.parseDecimalToFloat(room.airbnb_price)
          : undefined,
        booking_com_price: room.booking_com_price
          ? this.parseDecimalToFloat(room.booking_com_price)
          : undefined,
        total_cost: totalCost,
        nights: nights,
        max_capacity: room.max_capacity,
        amenities: room.amenities || [],
        pet_fee: room.pet_fee ? parseFloat(room.pet_fee.toString()) : undefined,
        minimum_nights: room.minimum_nights ?? undefined,
        cleaning_fee: room.cleaning_fee
          ? parseFloat(room.cleaning_fee.toString())
          : undefined,
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
   * Optimized version with caching and reduced object creation
   */
  public calculateRoomPricing(
    room: RoomWithRateRules,
    checkIn: Date,
    checkOut: Date,
    platform?: string,
  ): { totalCost: number; basePrice: number } {
    const startTime = Date.now();
    // Early return for simple case
    if (!room.rate_rules || room.rate_rules.length === 0) {
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      const platformBasePrice = this.getPlatformPrice(
        {
          base_price: this.parseDecimalToFloat(room.base_price),
          airbnb_price: room.airbnb_price !== null && room.airbnb_price !== undefined
            ? this.parseDecimalToFloat(room.airbnb_price)
            : null,
          booking_com_price: room.booking_com_price !== null && room.booking_com_price !== undefined
            ? this.parseDecimalToFloat(room.booking_com_price)
            : null,
        },
        platform,
      );

      return {
        totalCost: platformBasePrice * nights,
        basePrice: Math.max(
          platformBasePrice,
          this.parseDecimalToFloat(room.base_price),
        ),
      };
    }

    // Pre-calculate values to avoid repeated computation
    const basePrice = this.parseDecimalToFloat(room.base_price);
    const platformBasePrice = this.getPlatformPrice(
      {
        base_price: basePrice,
        airbnb_price: room.airbnb_price
          ? this.parseDecimalToFloat(room.airbnb_price)
          : null,
        booking_com_price: room.booking_com_price
          ? this.parseDecimalToFloat(room.booking_com_price)
          : null,
      },
      platform,
    );

    // Pre-filter and optimize rate rules
    const checkInTime = checkIn.getTime();
    const checkOutTime = checkOut.getTime();

    const applicableRateRules = room.rate_rules
      .filter((rateRule) => {
        const ruleStartTime = new Date(rateRule.start_date).getTime();
        const ruleEndTime = new Date(rateRule.end_date).getTime();
        return ruleStartTime <= checkOutTime && ruleEndTime >= checkInTime;
      })
      .map((rule) => ({
        price_per_night: this.parseDecimalToFloat(rule.price_per_night),
        day_of_week: rule.day_of_week,
        isGeneral: rule.day_of_week.length === 7,
      }));

    // Separate general and day-specific rules for efficiency
    const generalRule = applicableRateRules.find((rule) => rule.isGeneral);
    const daySpecificRules = applicableRateRules.filter(
      (rule) => !rule.isGeneral,
    );

    // Create day-of-week lookup map for performance
    const daySpecificLookup = new Map<number, number>();
    for (const rule of daySpecificRules) {
      for (const day of rule.day_of_week) {
        const currentPremium = daySpecificLookup.get(day) || 0;
        daySpecificLookup.set(
          day,
          Math.max(currentPremium, rule.price_per_night),
        );
      }
    }

    let totalCost = 0;
    let lowestNightlyRate = Infinity;

    // Optimize date iteration by using milliseconds
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nights = Math.ceil((checkOutTime - checkInTime) / oneDayMs);

    for (let i = 0; i < nights; i++) {
      const currentDateMs = checkInTime + i * oneDayMs;
      const dayOfWeek = new Date(currentDateMs).getDay();

      // Calculate rate for this night
      let nightRate = platformBasePrice;

      // Apply general rule if exists
      if (generalRule) {
        nightRate = basePrice + generalRule.price_per_night;
      }

      // Apply day-specific rule if exists (overrides general)
      const daySpecificPremium = daySpecificLookup.get(dayOfWeek);
      if (daySpecificPremium !== undefined) {
        nightRate = basePrice + daySpecificPremium;
      }

      totalCost += nightRate;
      if (nightRate < lowestNightlyRate) {
        lowestNightlyRate = nightRate;
      }
    }

    const result = {
      totalCost,
      basePrice:
        lowestNightlyRate === Infinity ? platformBasePrice : lowestNightlyRate,
    };

    // Record performance metrics
    const duration = Date.now() - startTime;
    this.performanceService.recordMetric({
      operation: 'calculateRoomPricing',
      duration,
      metadata: {
        roomId: room.id,
        rateRulesCount: room.rate_rules?.length || 0,
        nights,
        platform,
        totalCost: result.totalCost,
      },
    });

    // Log slow calculations
    if (duration > 10) {
      this.logger.warn(
        `Slow rate calculation: ${duration}ms for room ${room.id} with ${room.rate_rules?.length || 0} rate rules over ${nights} nights`,
      );
    }

    return result;
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
      airbnb_price?: number;
      booking_com_price?: number;
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
    if (editRoomDto.airbnb_price !== undefined)
      updateData.airbnb_price = editRoomDto.airbnb_price;
    if (editRoomDto.booking_com_price !== undefined)
      updateData.booking_com_price = editRoomDto.booking_com_price;
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
      base_price: parseFloat(updatedRoom.base_price.toString()),
      airbnb_price: updatedRoom.airbnb_price
        ? parseFloat(updatedRoom.airbnb_price.toString())
        : undefined,
      booking_com_price: updatedRoom.booking_com_price
        ? parseFloat(updatedRoom.booking_com_price.toString())
        : undefined,
      max_capacity: updatedRoom.max_capacity,
      status: updatedRoom.status,
      amenities: (updatedRoom.amenities as string[]) || [],
      pet_fee: updatedRoom.pet_fee
        ? parseFloat(updatedRoom.pet_fee.toString())
        : undefined,
      minimum_nights: updatedRoom.minimum_nights ?? undefined,
      cleaning_fee: updatedRoom.cleaning_fee
        ? parseFloat(updatedRoom.cleaning_fee.toString())
        : undefined,
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
        room_photos: true,
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

    // Delete associated image files
    for (const photo of room.room_photos) {
      try {
        await fs.unlink(join(process.cwd(), photo.image_url));
      } catch {
        // Continue even if file deletion fails
        console.warn(`Failed to delete image file: ${photo.image_url}`);
      }
    }

    // Delete the room (CASCADE will handle related records like photos, rate_rules, etc.)
    await this.prisma.room.delete({
      where: { id: roomId },
    });

    return {
      message: `Room ${room.name} has been successfully deleted`,
    };
  }

  async uploadRoomImage(
    roomId: string,
    file: Express.Multer.File,
    uploadDto: UploadRoomImageDto,
  ): Promise<RoomImageUploadResponseDto> {
    // Check if room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Get next sort order if not provided
    let sortOrder = uploadDto.sort_order;
    if (sortOrder === undefined) {
      const lastPhoto = await this.prisma.roomPhoto.findFirst({
        where: { room_id: roomId },
        orderBy: { sort_order: 'desc' },
      });
      sortOrder = lastPhoto ? lastPhoto.sort_order + 1 : 1;
    }

    // Create database record
    const photo = await this.prisma.roomPhoto.create({
      data: {
        room_id: roomId,
        image_url: `/uploads/rooms/${file.filename}`,
        sort_order: sortOrder,
      },
    });

    return {
      id: photo.id,
      room_id: photo.room_id,
      image_url: photo.image_url,
      sort_order: photo.sort_order,
    };
  }

  async deleteRoomImage(
    roomId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    // Check if room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Find the image
    const photo = await this.prisma.roomPhoto.findUnique({
      where: { id: imageId },
    });

    if (!photo || photo.room_id !== roomId) {
      throw new NotFoundException('Image not found');
    }

    // Delete the file
    try {
      await fs.unlink(join(process.cwd(), photo.image_url));
    } catch {
      // Continue even if file deletion fails
      console.warn(`Failed to delete image file: ${photo.image_url}`);
    }

    // Delete database record
    await this.prisma.roomPhoto.delete({
      where: { id: imageId },
    });

    return {
      message: 'Image deleted successfully',
    };
  }

  async updateRoomImageOrder(
    roomId: string,
    imageId: string,
    updateOrderDto: UpdateRoomImageOrderDto,
  ): Promise<RoomImageUploadResponseDto> {
    // Check if room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Find the image
    const photo = await this.prisma.roomPhoto.findUnique({
      where: { id: imageId },
    });

    if (!photo || photo.room_id !== roomId) {
      throw new NotFoundException('Image not found');
    }

    // Update sort order
    const updatedPhoto = await this.prisma.roomPhoto.update({
      where: { id: imageId },
      data: { sort_order: updateOrderDto.sort_order },
    });

    return {
      id: updatedPhoto.id,
      room_id: updatedPhoto.room_id,
      image_url: updatedPhoto.image_url,
      sort_order: updatedPhoto.sort_order,
    };
  }

  /**
   * Get platform-specific price for a room
   * @param room - Room object with platform pricing
   * @param platform - Platform to get pricing for
   * @returns Price in cents for the specified platform
   */
  getPlatformPrice(
    room: {
      base_price: number;
      airbnb_price?: number | null;
      booking_com_price?: number | null;
    },
    platform?: string,
  ): number {
    switch (platform?.toLowerCase()) {
      case 'airbnb':
        return room.airbnb_price ?? room.base_price;
      case 'booking.com':
      case 'booking_com':
        return room.booking_com_price ?? room.base_price;
      case 'website':
      case 'direct':
      default:
        return room.base_price;
    }
  }
}
