import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

// Type definitions for the booking data
type BookingWithRoom = {
  id: string;
  guest_name: string;
  check_out_date: Date;
  status: string;
  room: {
    name: string;
    hotel: {
      name: string;
    };
  };
};

@Injectable()
export class CleaningService {
  private readonly logger = new Logger(CleaningService.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
    private configService: ConfigService,
  ) {}

  @Cron('27 6 * * *', {
    name: 'daily-cleaning-notifications',
    timeZone: 'America/New_York', // Adjust timezone as needed
  })
  async sendDailyCleaningNotifications() {
    this.logger.log('🧹 Starting daily cleaning notifications check...');

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Find all confirmed bookings checking out today
      const checkoutsToday = await this.prisma.booking.findMany({
        where: {
          check_out_date: new Date(todayStr),
          status: 'confirmed',
        },
        include: {
          room: {
            include: {
              hotel: true,
            },
          },
        },
        orderBy: {
          room: {
            name: 'asc',
          },
        },
      });

      if (checkoutsToday.length === 0) {
        this.logger.log('No checkouts scheduled for today');
        return;
      }

      this.logger.log(
        `Found ${checkoutsToday.length} checkout(s) for today: ${checkoutsToday.map((b) => b.room.name).join(', ')}`,
      );

      // Get cleaning staff from database
      const cleaningStaff = await this.getCleaningStaff();

      if (cleaningStaff.length === 0) {
        this.logger.warn(
          'No cleaning staff found in database. Please add users with "cleaning" role.',
        );
        return;
      }

      // Group checkouts by hotel
      const checkoutsByHotel = this.groupCheckoutsByHotel(checkoutsToday);

      // Send notifications for each hotel
      for (const [hotelName, hotelCheckouts] of Object.entries(
        checkoutsByHotel,
      )) {
        await this.sendDividedCleaningNotifications(
          hotelName,
          hotelCheckouts,
          cleaningStaff,
        );
      }

      this.logger.log('✅ Daily cleaning notifications completed successfully');
    } catch (error) {
      this.logger.error(
        '❌ Failed to send daily cleaning notifications:',
        error,
      );
    }
  }

  private async getCleaningStaff(): Promise<
    { id: string; email: string; phone: string }[]
  > {
    try {
      const cleaningStaff = await this.prisma.user.findMany({
        where: {
          role: UserRole.cleaning,
        },
        select: {
          id: true,
          email: true,
          phone: true,
        },
      });

      return cleaningStaff.filter(
        (staff): staff is { id: string; email: string; phone: string } =>
          staff.phone !== null && staff.phone.length > 0,
      );
    } catch (error) {
      this.logger.error(
        'Error fetching cleaning staff:',
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  private async getCleaningStaffNumbers(): Promise<string[]> {
    const cleaningStaff = await this.getCleaningStaff();
    return cleaningStaff.map((staff) => staff.phone);
  }

  private groupCheckoutsByHotel(
    checkouts: BookingWithRoom[],
  ): Record<string, BookingWithRoom[]> {
    return checkouts.reduce(
      (acc, checkout) => {
        const hotelName = checkout.room.hotel.name;
        if (!acc[hotelName]) {
          acc[hotelName] = [];
        }
        acc[hotelName].push(checkout);
        return acc;
      },
      {} as Record<string, BookingWithRoom[]>,
    );
  }

  private async sendDividedCleaningNotifications(
    hotelName: string,
    checkouts: BookingWithRoom[],
    cleaningStaff: { id: string; email: string; phone: string }[],
  ) {
    const today = new Date().toLocaleDateString();

    // Divide rooms among cleaning staff
    const roomAssignments = this.divideRoomsAmongStaff(
      checkouts,
      cleaningStaff,
    );

    // Send personalized notifications to each staff member
    const sendPromises = cleaningStaff.map(async (staff) => {
      const assignedRooms = roomAssignments[staff.id];
      if (assignedRooms.length === 0) return;

      // Create room list with guest info and checkout times
      const roomDetails = assignedRooms
        .map((checkout) => {
          const roomName = checkout.room.name;
          const guestName = checkout.guest_name;
          const checkoutTime = '11:00 AM'; // Default checkout time
          return `• Room ${roomName} - ${guestName} (checkout: ${checkoutTime})`;
        })
        .join('\n');

      const message = `🧹 CLEANING ASSIGNMENT - ${today}

🏨 ${hotelName}
👤 Staff: ${staff.email}

📋 Your assigned rooms (${assignedRooms.length} room${assignedRooms.length > 1 ? 's' : ''}):
${roomDetails}

⏰ Standard cleaning checklist:
• Replace bed linens and pillowcases
• Clean and disinfect bathroom
• Vacuum carpets and mop floors
• Empty trash and replace liners
• Restock amenities (towels, toiletries)
• Check and clean mini fridge
• Dust furniture and surfaces
• Check room condition and report any issues

Please confirm completion by replying to this message.

Hotel Lion Management 🦁`;

      try {
        await this.whatsAppService.sendMessage(staff.phone, message);
        this.logger.log(
          `✅ Sent cleaning assignment to ${staff.email} (${assignedRooms.length} rooms)`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to send cleaning assignment to ${staff.email}:`,
          error,
        );
      }
    });

    await Promise.all(sendPromises);
  }

  private divideRoomsAmongStaff(
    checkouts: BookingWithRoom[],
    cleaningStaff: { id: string; email: string; phone: string }[],
  ): Record<string, BookingWithRoom[]> {
    const assignments: Record<string, BookingWithRoom[]> = {};

    // Initialize assignments for each staff member
    cleaningStaff.forEach((staff) => {
      assignments[staff.id] = [];
    });

    // Distribute rooms evenly among staff
    checkouts.forEach((checkout, index) => {
      const staffIndex = index % cleaningStaff.length;
      const staffId = cleaningStaff[staffIndex].id;
      assignments[staffId].push(checkout);
    });

    return assignments;
  }

  // Manual trigger endpoint for testing
  async triggerCleaningNotifications(): Promise<{
    success: boolean;
    message: string;
    checkoutsFound: number;
  }> {
    this.logger.log('🧪 Manual trigger: sending cleaning notifications...');

    try {
      await this.sendDailyCleaningNotifications();

      // Get count of today's checkouts for response
      const today = new Date().toISOString().split('T')[0];
      const checkoutsCount = await this.prisma.booking.count({
        where: {
          check_out_date: new Date(today),
          status: 'confirmed',
        },
      });

      return {
        success: true,
        message: 'Cleaning notifications sent successfully',
        checkoutsFound: checkoutsCount,
      };
    } catch (error) {
      this.logger.error('Failed to trigger cleaning notifications:', error);
      return {
        success: false,
        message: 'Failed to send cleaning notifications',
        checkoutsFound: 0,
      };
    }
  }
}
