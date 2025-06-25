import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OccupancyRateDto,
  MonthlyRevenueDto,
  AverageDailyRateDto,
  BookingTrendsDto,
} from './dto/stats-response.dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOccupancyRate(
    hotelId: string,
    startDate: string,
    endDate: string,
  ): Promise<OccupancyRateDto> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate total room nights (rooms × days)
    const totalRooms = await this.prisma.room.count({
      where: { hotel_id: hotelId },
    });

    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalRoomNights = totalRooms * daysDiff;

    // Calculate occupied room nights
    const occupiedBookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        OR: [
          {
            check_in_date: { gte: start, lte: end },
          },
          {
            check_out_date: { gte: start, lte: end },
          },
          {
            AND: [
              { check_in_date: { lte: start } },
              { check_out_date: { gte: end } },
            ],
          },
        ],
      },
    });

    let occupiedRoomNights = 0;
    occupiedBookings.forEach((booking) => {
      const checkIn = new Date(
        Math.max(booking.check_in_date.getTime(), start.getTime()),
      );
      const checkOut = new Date(
        Math.min(booking.check_out_date.getTime(), end.getTime()),
      );
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      occupiedRoomNights += Math.max(0, nights);
    });

    const occupancyRate =
      totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;

    return {
      start_date: startDate,
      end_date: endDate,
      total_room_nights: totalRoomNights,
      occupied_room_nights: occupiedRoomNights,
      occupancy_rate: Math.round(occupancyRate * 100) / 100,
    };
  }

  async getMonthlyRevenue(
    hotelId: string,
    year: number,
    month: number,
  ): Promise<MonthlyRevenueDto> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const revenueData = await this.prisma.booking.aggregate({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        check_in_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total_cost: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenue = revenueData._sum.total_cost || 0;
    const bookingCount = revenueData._count.id;
    const averageBookingValue =
      bookingCount > 0 ? Math.round(totalRevenue / bookingCount) : 0;

    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      total_revenue: totalRevenue,
      total_revenue_dollars: totalRevenue / 100,
      booking_count: bookingCount,
      average_booking_value: averageBookingValue,
    };
  }

  async getAverageDailyRate(
    hotelId: string,
    startDate: string,
    endDate: string,
  ): Promise<AverageDailyRateDto> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const revenueData = await this.prisma.booking.aggregate({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        OR: [
          {
            check_in_date: { gte: start, lte: end },
          },
          {
            check_out_date: { gte: start, lte: end },
          },
          {
            AND: [
              { check_in_date: { lte: start } },
              { check_out_date: { gte: end } },
            ],
          },
        ],
      },
      _sum: {
        total_cost: true,
      },
    });

    // Calculate occupied room nights (same logic as occupancy rate)
    const occupiedBookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        OR: [
          {
            check_in_date: { gte: start, lte: end },
          },
          {
            check_out_date: { gte: start, lte: end },
          },
          {
            AND: [
              { check_in_date: { lte: start } },
              { check_out_date: { gte: end } },
            ],
          },
        ],
      },
    });

    let occupiedRoomNights = 0;
    occupiedBookings.forEach((booking) => {
      const checkIn = new Date(
        Math.max(booking.check_in_date.getTime(), start.getTime()),
      );
      const checkOut = new Date(
        Math.min(booking.check_out_date.getTime(), end.getTime()),
      );
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      occupiedRoomNights += Math.max(0, nights);
    });

    const totalRevenue = revenueData._sum.total_cost || 0;
    const adrCents =
      occupiedRoomNights > 0
        ? Math.round(totalRevenue / occupiedRoomNights)
        : 0;

    return {
      start_date: startDate,
      end_date: endDate,
      total_revenue: totalRevenue,
      occupied_room_nights: occupiedRoomNights,
      adr_cents: adrCents,
      adr_dollars: adrCents / 100,
    };
  }

  async getBookingTrends(
    hotelId: string,
    months: number = 6,
  ): Promise<BookingTrendsDto[]> {
    const results: BookingTrendsDto[] = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const bookingStats = await this.prisma.booking.groupBy({
        by: ['status'],
        where: {
          room: { hotel_id: hotelId },
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      });

      let totalBookings = 0;
      let confirmedBookings = 0;
      let cancelledBookings = 0;
      let pendingBookings = 0;

      bookingStats.forEach((stat) => {
        const count = stat._count.id;
        totalBookings += count;

        switch (stat.status) {
          case 'confirmed':
            confirmedBookings = count;
            break;
          case 'cancelled':
            cancelledBookings = count;
            break;
          case 'pending':
            pendingBookings = count;
            break;
        }
      });

      // Calculate growth percentage (compared to previous month if available)
      let growthPercentage = 0;
      if (results.length > 0) {
        const previousMonth = results[results.length - 1];
        if (previousMonth.total_bookings > 0) {
          growthPercentage =
            ((totalBookings - previousMonth.total_bookings) /
              previousMonth.total_bookings) *
            100;
        }
      }

      results.push({
        month: `${year}-${month.toString().padStart(2, '0')}`,
        total_bookings: totalBookings,
        confirmed_bookings: confirmedBookings,
        cancelled_bookings: cancelledBookings,
        pending_bookings: pendingBookings,
        growth_percentage: Math.round(growthPercentage * 100) / 100,
      });
    }

    return results;
  }
}
