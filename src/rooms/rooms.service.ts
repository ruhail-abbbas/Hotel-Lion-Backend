import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsListResponseDto, RoomListDto } from './dto/room-response.dto';

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
}
