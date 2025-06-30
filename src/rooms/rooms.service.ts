import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RoomsListResponseDto,
  RoomListDto,
  RoomCalendarResponseDto,
  RoomCalendarDto,
  BookingDto,
} from './dto/room-response.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusResponseDto,
  RoomStatus,
} from './dto/update-room-status.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async getAllRooms(hotelId: string): Promise<RoomsListResponseDto> {
    // Get all rooms with their photos, ordered by name
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
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data to match our DTO
    const roomsList: RoomListDto[] = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description || '',
      size_sqm: room.size_sqm || 0,
      bed_setup: room.bed_setup || '',
      base_price: room.base_price,
      base_price_dollars: room.base_price / 100,
      max_capacity: room.max_capacity,
      amenities: room.amenities || [],
      photos: room.room_photos.map((photo) => ({
        id: photo.id,
        image_url: photo.image_url,
        sort_order: photo.sort_order,
      })),
    }));

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
          total_cost_dollars: booking.total_cost / 100,
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
}
