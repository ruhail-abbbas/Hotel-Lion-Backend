import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCheckoutWithBookingDto } from './dto/create-checkout-with-booking.dto';
import {
  CheckoutSessionResponseDto,
  PaymentSuccessResponseDto,
} from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    });
  }

  async createCheckoutWithBooking(
    createBookingDto: CreateCheckoutWithBookingDto,
  ): Promise<CheckoutSessionResponseDto> {
    const {
      room_id,
      guest_name,
      guest_email,
      check_in_date,
      check_out_date,
      guest_contact,
      source,
      adults,
      infants,
      success_url,
      cancel_url,
    } = createBookingDto;

    try {
      // Convert string dates to Date objects for validation
      const checkInDate = new Date(check_in_date);
      const checkOutDate = new Date(check_out_date);

      // Validate dates
      this.validateBookingDates(checkInDate, checkOutDate);

      // Check if room exists and get pricing
      const room = await this.prisma.room.findUnique({
        where: { id: room_id },
        include: {
          rate_rules: {
            orderBy: {
              price_per_night: 'desc',
            },
          },
          hotel: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!room) {
        throw new BadRequestException('Room not found');
      }

      // Check room availability (without creating booking)
      await this.checkRoomAvailability(room_id, checkInDate, checkOutDate);

      // Calculate pricing using RoomsService-like logic
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Simple pricing calculation (can be enhanced with rate rules later)
      const basePrice = room.base_price;
      const cleaningFee = room.cleaning_fee || 0;
      const totalCost = (basePrice * nights) + cleaningFee;

      // Generate a temporary booking reference for tracking
      const tempBookingRef = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create Stripe checkout session with all booking details in metadata
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${room.hotel.name} - Suite ${room.name}`,
                description: `${nights} night${nights > 1 ? 's' : ''} • ${check_in_date} to ${check_out_date}`,
              },
              unit_amount: totalCost, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url,
        metadata: {
          // Store all booking details in metadata for webhook processing
          temp_booking_ref: tempBookingRef,
          room_id: room_id,
          guest_name: guest_name,
          guest_email: guest_email,
          check_in_date: check_in_date,
          check_out_date: check_out_date,
          guest_contact: guest_contact || '',
          source: source || 'Website',
          adults: adults.toString(),
          infants: infants.toString(),
          total_cost: totalCost.toString(),
          hotel_name: room.hotel.name,
          room_name: room.name,
        },
        customer_email: guest_email,
        payment_intent_data: {
          metadata: {
            temp_booking_ref: tempBookingRef,
            room_id: room_id,
          },
        },
        billing_address_collection: 'required',
        automatic_tax: {
          enabled: true,
        },
        allow_promotion_codes: false,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      this.logger.log(`Created Stripe checkout session ${session.id} for room ${room_id} (${tempBookingRef})`);

      if (!session.url) {
        throw new InternalServerErrorException('Failed to generate checkout URL');
      }

      return {
        session_id: session.id,
        checkout_url: session.url,
        booking_id: tempBookingRef, // Return temp ref instead of actual booking ID
      };
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session for room ${room_id}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  async createCheckoutSession(
    createSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    const { booking_id, success_url, cancel_url } = createSessionDto;

    try {
      // Fetch booking details with room information
      const booking = await this.prisma.booking.findUnique({
        where: { id: booking_id },
        include: {
          room: {
            select: {
              name: true,
              hotel: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      if (booking.status !== 'pending') {
        throw new BadRequestException(
          'Only pending bookings can be paid for',
        );
      }

      // Calculate nights
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Create Stripe checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${booking.room.hotel.name} - Suite ${booking.room.name}`,
                description: `${nights} night${nights > 1 ? 's' : ''} • ${booking.check_in_date.toISOString().split('T')[0]} to ${booking.check_out_date.toISOString().split('T')[0]}`,
                metadata: {
                  room_name: booking.room.name,
                  hotel_name: booking.room.hotel.name,
                  check_in: booking.check_in_date.toISOString().split('T')[0],
                  check_out: booking.check_out_date.toISOString().split('T')[0],
                  nights: nights.toString(),
                },
              },
              unit_amount: booking.total_cost, // Amount is already in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url,
        metadata: {
          booking_id: booking.id,
          reference_number: booking.reference_number,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
        },
        customer_email: booking.guest_email,
        payment_intent_data: {
          metadata: {
            booking_id: booking.id,
            reference_number: booking.reference_number,
          },
        },
        billing_address_collection: 'required',
        automatic_tax: {
          enabled: true,
        },
        allow_promotion_codes: false,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      this.logger.log(`Created Stripe checkout session ${session.id} for booking ${booking_id}`);

      if (!session.url) {
        throw new InternalServerErrorException('Failed to generate checkout URL');
      }

      return {
        session_id: session.id,
        checkout_url: session.url,
        booking_id: booking.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session for booking ${booking_id}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  async handleStripeWebhook(
    signature: string,
    payload: Buffer,
  ): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.type}:`, error);
      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const tempBookingRef = session.metadata?.temp_booking_ref;
    const existingBookingId = session.metadata?.booking_id;

    // Handle both old flow (existing booking) and new flow (create booking from metadata)
    if (existingBookingId) {
      // Old flow: Update existing booking
      await this.handleExistingBookingPayment(session, existingBookingId);
    } else if (tempBookingRef) {
      // New flow: Create booking from metadata
      await this.handleNewBookingPayment(session, tempBookingRef);
    } else {
      this.logger.error('No booking_id or temp_booking_ref found in checkout session metadata');
      return;
    }
  }

  private async handleExistingBookingPayment(
    session: Stripe.Checkout.Session,
    bookingId: string,
  ): Promise<void> {
    this.logger.log(`Processing successful checkout for existing booking ${bookingId}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Update booking status to confirmed
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'confirmed' },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            booking_id: bookingId,
            amount: session.amount_total || 0,
            payment_method: 'Card',
            identifier: session.payment_intent as string,
          },
        });

        this.logger.log(`Successfully confirmed existing booking ${bookingId}`);
      });
    } catch (error) {
      this.logger.error(`Failed to process existing booking ${bookingId}:`, error);
      throw error;
    }
  }

  private async handleNewBookingPayment(
    session: Stripe.Checkout.Session,
    tempBookingRef: string,
  ): Promise<void> {
    this.logger.log(`Creating new booking from successful payment (${tempBookingRef})`);

    try {
      const metadata = session.metadata;
      if (!metadata) {
        throw new Error('No metadata found in session');
      }

      // Extract booking details from metadata
      const roomId = metadata.room_id;
      const guestName = metadata.guest_name;
      const guestEmail = metadata.guest_email;
      const checkInDate = new Date(metadata.check_in_date);
      const checkOutDate = new Date(metadata.check_out_date);
      const guestContact = metadata.guest_contact || null;
      const source = metadata.source || 'Website';
      const totalCost = parseInt(metadata.total_cost);

      // Generate real booking reference
      const referenceNumber = await this.generateBookingReference();

      await this.prisma.$transaction(async (tx) => {
        // Check room availability one more time before creating booking
        const overlappingBookings = await tx.booking.findMany({
          where: {
            room_id: roomId,
            status: {
              in: ['pending', 'confirmed'],
            },
            OR: [
              {
                AND: [
                  { check_in_date: { gte: checkInDate } },
                  { check_in_date: { lt: checkOutDate } },
                ],
              },
              {
                AND: [
                  { check_out_date: { gt: checkInDate } },
                  { check_out_date: { lte: checkOutDate } },
                ],
              },
              {
                AND: [
                  { check_in_date: { lte: checkInDate } },
                  { check_out_date: { gte: checkOutDate } },
                ],
              },
            ],
          },
        });

        if (overlappingBookings.length > 0) {
          throw new Error('Room is no longer available');
        }

        // Create the booking with confirmed status (since payment already succeeded)
        const booking = await tx.booking.create({
          data: {
            room_id: roomId,
            reference_number: referenceNumber,
            guest_name: guestName,
            guest_contact: guestContact,
            guest_email: guestEmail,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            total_cost: totalCost,
            source: source,
            status: 'confirmed', // Directly confirmed since payment succeeded
          },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            booking_id: booking.id,
            amount: session.amount_total || 0,
            payment_method: 'Card',
            identifier: session.payment_intent as string,
          },
        });

        this.logger.log(
          `Successfully created and confirmed booking ${booking.id} (${referenceNumber}) from payment`,
        );
      });
    } catch (error) {
      this.logger.error(`Failed to create booking from payment (${tempBookingRef}):`, error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id;
    if (bookingId) {
      this.logger.log(`Payment succeeded for booking ${bookingId}`);
      // Additional logic can be added here if needed
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id;
    if (bookingId) {
      this.logger.warn(`Payment failed for booking ${bookingId}`);
      // TODO: Handle failed payment (e.g., notify user, cancel booking after timeout)
    }
  }

  async getPaymentSuccess(sessionId: string): Promise<PaymentSuccessResponseDto> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      // Handle both old flow (booking_id) and new flow (temp_booking_ref)
      let bookingId = session.metadata?.booking_id;
      
      if (!bookingId && session.metadata?.temp_booking_ref) {
        // New flow: find the actual booking created from this payment
        const payment = await this.prisma.payment.findFirst({
          where: {
            identifier: session.payment_intent as string,
          },
          include: {
            booking: true,
          },
        });
        
        if (payment?.booking) {
          bookingId = payment.booking.id;
        }
      }

      if (!bookingId) {
        throw new BadRequestException('Invalid session or missing booking information');
      }

      return {
        message: 'Payment completed successfully',
        booking_id: bookingId,
        amount_paid: session.amount_total || 0,
        payment_intent_id: session.payment_intent as string,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve payment success data for session ${sessionId}:`, error);
      throw new BadRequestException('Invalid payment session');
    }
  }

  private validateBookingDates(checkInDate: Date, checkOutDate: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if check-in date is not in the past
    if (checkInDate < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Check if check-out date is after check-in date
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // Check if booking is not too far in the future (optional: 2 years max)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(today.getFullYear() + 2);
    if (checkInDate > maxFutureDate) {
      throw new BadRequestException(
        'Check-in date cannot be more than 2 years in the future',
      );
    }
  }

  private async checkRoomAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void> {
    // Check for overlapping confirmed bookings
    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        room_id: roomId,
        status: {
          in: ['pending', 'confirmed'], // Exclude cancelled bookings
        },
        OR: [
          // Booking starts during the requested period
          {
            AND: [
              { check_in_date: { gte: checkInDate } },
              { check_in_date: { lt: checkOutDate } },
            ],
          },
          // Booking ends during the requested period
          {
            AND: [
              { check_out_date: { gt: checkInDate } },
              { check_out_date: { lte: checkOutDate } },
            ],
          },
          // Booking spans the entire requested period
          {
            AND: [
              { check_in_date: { lte: checkInDate } },
              { check_out_date: { gte: checkOutDate } },
            ],
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      throw new BadRequestException(
        `Room is not available for the selected dates. Conflicting booking reference: ${overlappingBookings[0].reference_number}`,
      );
    }

    // Check for blocked dates
    const blockedDates = await this.prisma.blockedDate.findMany({
      where: {
        room_id: roomId,
        blocked_date: {
          gte: checkInDate,
          lt: checkOutDate,
        },
      },
    });

    if (blockedDates.length > 0) {
      throw new BadRequestException(
        `Room is blocked for some of the selected dates. First blocked date: ${blockedDates[0].blocked_date.toISOString().split('T')[0]}`,
      );
    }
  }

  private async generateBookingReference(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `BK-${currentYear}-`;

    // Find the highest existing reference number for this year
    const lastBooking = await this.prisma.booking.findFirst({
      where: {
        reference_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        reference_number: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastBooking) {
      const lastNumber = parseInt(
        lastBooking.reference_number.replace(prefix, ''),
        10,
      );
      nextNumber = lastNumber + 1;
    }

    // Pad with zeros to make it 4 digits
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  }
}