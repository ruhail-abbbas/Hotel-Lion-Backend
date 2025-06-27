import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OccupancyRateDto,
  MonthlyRevenueDto,
  AverageDailyRateDto,
  BookingTrendsDto,
  CheckInsTodayDto,
  HotelRoomsStatusDto,
  RoomStatusDto,
  CustomersListDto,
  CheckOutsTodayDto,
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

  async getCheckInsToday(
    hotelId: string,
    date?: string,
  ): Promise<CheckInsTodayDto> {
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all confirmed bookings with check-in date on the target date
    const checkInBookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        check_in_date: {
          gte: startOfDay,
          lte: endOfDay,
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
        check_in_date: 'asc',
      },
    });

    // Calculate nights for each booking
    const checkins = checkInBookings.map((booking) => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        booking_id: booking.id,
        reference_number: booking.reference_number,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        room_name: booking.room.name,
        check_in_date: booking.check_in_date.toISOString().split('T')[0],
        check_out_date: booking.check_out_date.toISOString().split('T')[0],
        total_cost: booking.total_cost,
        nights,
      };
    });

    return {
      date: targetDate.toISOString().split('T')[0],
      total_checkins: checkins.length,
      checkins,
    };
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
  async getRoomsStatus(
    hotelId: string,
    date?: string,
  ): Promise<HotelRoomsStatusDto> {
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all rooms for the hotel
    const rooms = await this.prisma.room.findMany({
      where: { hotel_id: hotelId },
      orderBy: { name: 'asc' },
    });

    // Get all confirmed bookings that overlap with the target date
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        check_in_date: { lte: endOfDay },
        check_out_date: { gt: startOfDay },
      },
      include: {
        room: {
          select: {
            id: true,
          },
        },
      },
    });

    // Create a map of room_id to booking for quick lookup
    const roomBookingMap = new Map();
    activeBookings.forEach((booking) => {
      roomBookingMap.set(booking.room.id, booking);
    });

    // Process each room and determine its status
    const roomStatuses: RoomStatusDto[] = rooms.map((room) => {
      const booking = roomBookingMap.get(room.id);

      let bookingStatus = 'available';
      let currentBooking: {
        booking_id: string;
        reference_number: string;
        guest_name: string;
        guest_email: string;
        guest_contact?: string;
        check_in_date: string;
        check_out_date: string;
        total_cost: number;
        nights: number;
        booking_status: string;
      } | null = null;

      if (booking) {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Determine booking status based on dates
        if (checkIn.toDateString() === targetDate.toDateString()) {
          bookingStatus = 'checking_in_today';
        } else if (checkOut.toDateString() === targetDate.toDateString()) {
          bookingStatus = 'checking_out_today';
        } else {
          bookingStatus = 'occupied';
        }

        currentBooking = {
          booking_id: booking.id,
          reference_number: booking.reference_number,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          guest_contact: booking.guest_contact || undefined,
          check_in_date: booking.check_in_date.toISOString().split('T')[0],
          check_out_date: booking.check_out_date.toISOString().split('T')[0],
          total_cost: booking.total_cost,
          nights,
          booking_status: booking.status,
        };
      }

      return {
        room_id: room.id,
        room_name: room.name,
        room_description: room.description || '',
        max_capacity: room.max_capacity,
        base_price: room.base_price,
        room_status: room.status,
        booking_status: bookingStatus,
        booking: currentBooking,
      };
    });

    // Calculate summary stats
    const totalRooms = rooms.length;
    const occupiedRooms = roomStatuses.filter(
      (r) =>
        r.booking_status === 'occupied' ||
        r.booking_status === 'checking_in_today' ||
        r.booking_status === 'checking_out_today',
    ).length;
    const outOfServiceRooms = roomStatuses.filter(
      (r) => r.room_status === 'out_of_service',
    ).length;
    const cleaningRooms = roomStatuses.filter(
      (r) => r.room_status === 'cleaning',
    ).length;
    const availableRooms =
      totalRooms - occupiedRooms - outOfServiceRooms - cleaningRooms;

    return {
      date: targetDate.toISOString().split('T')[0],
      hotel_id: hotelId,
      total_rooms: totalRooms,
      available_rooms: Math.max(0, availableRooms),
      occupied_rooms: occupiedRooms,
      out_of_service_rooms: outOfServiceRooms,
      cleaning_rooms: cleaningRooms,
      rooms: roomStatuses,
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
  async getCustomers(hotelId: string): Promise<CustomersListDto> {
    // Get all bookings for the hotel with room information
    const bookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
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

    // Group bookings by email to aggregate customer data
    const customerMap = new Map();

    bookings.forEach((booking) => {
      const email = booking.guest_email;

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email,
          name: booking.guest_name,
          contact: booking.guest_contact || '',
          bookings: [],
          total_spent: 0,
          first_booking_date: booking.created_at,
          last_booking_date: booking.created_at,
        });
      }

      const customer = customerMap.get(email);

      // Update customer totals
      customer.total_spent += booking.total_cost;

      // Update booking dates
      if (booking.created_at < customer.first_booking_date) {
        customer.first_booking_date = booking.created_at;
      }
      if (booking.created_at > customer.last_booking_date) {
        customer.last_booking_date = booking.created_at;
      }

      // Calculate nights for this booking
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Add booking to customer's booking list
      customer.bookings.push({
        booking_id: booking.id,
        reference_number: booking.reference_number,
        room_name: booking.room.name,
        check_in_date: booking.check_in_date.toISOString().split('T')[0],
        check_out_date: booking.check_out_date.toISOString().split('T')[0],
        total_cost: booking.total_cost,
        total_cost_dollars: booking.total_cost / 100,
        nights,
        status: booking.status,
        source: booking.source || 'Website',
        created_at: booking.created_at.toISOString(),
      });
    });

    // Convert map to array and sort by total spent (highest first)
    const customers = Array.from(customerMap.values())
      .map((customer) => ({
        email: customer.email,
        name: customer.name,
        contact: customer.contact,
        total_bookings: customer.bookings.length,
        total_spent: customer.total_spent,
        total_spent_dollars: customer.total_spent / 100,
        first_booking_date: customer.first_booking_date.toISOString(),
        last_booking_date: customer.last_booking_date.toISOString(),
        bookings: customer.bookings.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }))
      .sort((a, b) => b.total_spent - a.total_spent);

    // Calculate summary statistics
    const totalCustomers = customers.length;
    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter((b) => b.status === 'confirmed')
      .reduce((sum, booking) => sum + booking.total_cost, 0);

    return {
      hotel_id: hotelId,
      total_customers: totalCustomers,
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      total_revenue_dollars: totalRevenue / 100,
      customers,
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

  async getCheckOutsToday(
    hotelId: string,
    date?: string,
  ): Promise<CheckOutsTodayDto> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const checkOutBookings = await this.prisma.booking.findMany({
      where: {
        room: { hotel_id: hotelId },
        status: 'confirmed',
        check_out_date: {
          gte: startOfDay,
          lte: endOfDay,
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
        check_out_date: 'asc',
      },
    });

    const checkouts = checkOutBookings.map((booking) => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        booking_id: booking.id,
        reference_number: booking.reference_number,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        room_name: booking.room.name,
        check_in_date: booking.check_in_date.toISOString().split('T')[0],
        check_out_date: booking.check_out_date.toISOString().split('T')[0],
        total_cost: booking.total_cost,
        nights,
      };
    });

    return {
      date: targetDate.toISOString().split('T')[0],
      total_checkouts: checkouts.length,
      checkouts,
    };
  }
}
