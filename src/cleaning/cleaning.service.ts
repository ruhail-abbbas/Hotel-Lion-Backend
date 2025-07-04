import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';

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

  @Cron('30 9 * * *', {
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

      // Get cleaning staff phone numbers from environment
      const cleaningStaffNumbers = this.getCleaningStaffNumbers();

      if (cleaningStaffNumbers.length === 0) {
        this.logger.warn(
          'No cleaning staff phone numbers configured. Add CLEANING_STAFF_NUMBERS to environment variables.',
        );
        return;
      }

      // Group checkouts by hotel
      const checkoutsByHotel = this.groupCheckoutsByHotel(checkoutsToday);

      // Send notifications for each hotel
      for (const [hotelName, hotelCheckouts] of Object.entries(
        checkoutsByHotel,
      )) {
        await this.sendHotelCleaningNotifications(
          hotelName,
          hotelCheckouts,
          cleaningStaffNumbers,
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

  private getCleaningStaffNumbers(): string[] {
    const numbersStr = this.configService.get<string>('CLEANING_STAFF_NUMBERS');
    if (!numbersStr) {
      return [];
    }

    // Parse comma-separated phone numbers
    return numbersStr
      .split(',')
      .map((num) => num.trim())
      .filter((num) => num.length > 0);
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

  private async sendHotelCleaningNotifications(
    hotelName: string,
    checkouts: BookingWithRoom[],
    staffNumbers: string[],
  ) {
    const today = new Date().toLocaleDateString();

    // Create room list with guest info and checkout times
    const roomDetails = checkouts
      .map((checkout) => {
        const roomName = checkout.room.name;
        const guestName = checkout.guest_name;
        const checkoutTime = '11:00 AM'; // Default checkout time
        return `• Room ${roomName} - ${guestName} (checkout: ${checkoutTime})`;
      })
      .join('\n');

    const message = `🧹 CLEANING SCHEDULE - ${today}

🏨 ${hotelName}

📋 Rooms to clean today:
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

    // Send to all cleaning staff
    const sendPromises = staffNumbers.map(async (phoneNumber) => {
      try {
        await this.whatsAppService.sendMessage(phoneNumber, message);
        this.logger.log(
          `✅ Cleaning notification sent to ${phoneNumber} for ${hotelName}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to send notification to ${phoneNumber}:`,
          error,
        );
      }
    });

    await Promise.all(sendPromises);
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
