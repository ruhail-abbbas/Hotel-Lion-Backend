import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHotelDto, HotelResponseDto } from './dto/update-hotel.dto';

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
}
