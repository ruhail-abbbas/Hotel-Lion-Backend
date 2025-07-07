import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHotelDto, HotelResponseDto } from './dto/update-hotel.dto';
import {
  HotelDetailsResponseDto,
  HotelUserDto,
  HotelStatsDto,
} from './dto/hotel-details.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  async updateHotel(
    hotelId: string,
    updateHotelDto: UpdateHotelDto,
  ): Promise<HotelResponseDto> {
    // Check if hotel exists
    const existingHotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!existingHotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Prepare update data, merging contact_info if provided
    const updateData: any = {
      ...updateHotelDto,
      updated_at: new Date(),
    };

    // Handle contact_info merge - if provided, merge with existing data
    if (updateHotelDto.contact_info) {
      const existingContactInfo = (existingHotel.contact_info as any) || {};
      updateData.contact_info = {
        ...existingContactInfo,
        ...updateHotelDto.contact_info,
      };
    }

    // Remove currency and tax_rate from update data as they're not in the schema yet
    // These would need to be added to the schema or stored in contact_info/JSON field
    if (updateData.currency) {
      if (!updateData.contact_info) {
        updateData.contact_info = (existingHotel.contact_info as any) || {};
      }
      updateData.contact_info.currency = updateData.currency;
      delete updateData.currency;
    }

    if (updateData.tax_rate !== undefined) {
      if (!updateData.contact_info) {
        updateData.contact_info = (existingHotel.contact_info as any) || {};
      }
      updateData.contact_info.tax_rate = updateData.tax_rate;
      delete updateData.tax_rate;
    }

    // Update hotel
    const updatedHotel = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: updateData,
    });

    // Transform response
    const contactInfo = (updatedHotel.contact_info as any) || {};

    return {
      id: updatedHotel.id,
      name: updatedHotel.name,
      location: updatedHotel.location,
      contact_info: {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        website: contactInfo.website || '',
      },
      default_checkin_time: updatedHotel.default_checkin_time || '15:00',
      default_checkout_time: updatedHotel.default_checkout_time || '11:00',
      policies: updatedHotel.policies || '',
      currency: contactInfo.currency || 'USD',
      tax_rate: contactInfo.tax_rate || 0,
      created_at: updatedHotel.created_at.toISOString(),
      updated_at: updatedHotel.updated_at.toISOString(),
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  async getHotel(hotelId: string): Promise<HotelResponseDto> {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Transform response
    const contactInfo = (hotel.contact_info as any) || {};

    return {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      contact_info: {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        website: contactInfo.website || '',
      },
      default_checkin_time: hotel.default_checkin_time || '15:00',
      default_checkout_time: hotel.default_checkout_time || '11:00',
      policies: hotel.policies || '',
      currency: contactInfo.currency || 'USD',
      tax_rate: contactInfo.tax_rate || 0,
      created_at: hotel.created_at.toISOString(),
      updated_at: hotel.updated_at.toISOString(),
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

  async getHotelDetails(hotelId: string): Promise<HotelDetailsResponseDto> {
    // Get hotel with all related users and stats data
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        hotel_users: {
          include: {
            user: true,
          },
        },
        rooms: {
          include: {
            bookings: {
              where: {
                status: {
                  in: ['pending', 'confirmed'],
                },
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Transform users data
    const users: HotelUserDto[] = hotel.hotel_users.map((hotelUser) => ({
      id: hotelUser.user.id,
      email: hotelUser.user.email,
      phone: hotelUser.user.phone || undefined,
      role: hotelUser.user.role,
      created_at: hotelUser.user.created_at.toISOString(),
      updated_at: hotelUser.user.updated_at.toISOString(),
    }));

    // Separate managers and staff
    const managers = users.filter((user) => user.role === 'admin');
    const staff = users.filter((user) => user.role === 'staff');

    // Calculate room statistics
    const totalRooms = hotel.rooms.length;
    const availableRooms = hotel.rooms.filter(
      (room) => room.status === 'available',
    ).length;
    const outOfServiceRooms = hotel.rooms.filter(
      (room) => room.status === 'out_of_service',
    ).length;
    const cleaningRooms = hotel.rooms.filter(
      (room) => room.status === 'cleaning',
    ).length;

    // Calculate total active bookings
    const totalActiveBookings = hotel.rooms.reduce(
      (total, room) => total + room.bookings.length,
      0,
    );

    // Create stats object
    const stats: HotelStatsDto = {
      total_rooms: totalRooms,
      available_rooms: availableRooms,
      out_of_service_rooms: outOfServiceRooms,
      cleaning_rooms: cleaningRooms,
      total_active_bookings: totalActiveBookings,
      total_users: users.length,
    };

    // Transform contact info
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
    const contactInfo = (hotel.contact_info as any) || {};

    return {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      contact_info:
        Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
      policies: hotel.policies || undefined,
      default_checkin_time: hotel.default_checkin_time || undefined,
      default_checkout_time: hotel.default_checkout_time || undefined,
      created_at: hotel.created_at.toISOString(),
      updated_at: hotel.updated_at.toISOString(),
      users,
      managers,
      staff,
      stats,
    };
  }
}
