import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCheckoutWithBookingDto } from './dto/create-checkout-with-booking.dto';
import {
  CheckoutSessionResponseDto,
  PaymentSuccessResponseDto,
} from './dto/payment-response.dto';

@ApiTags('Payments')
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-with-booking')
  @ApiOperation({
    summary: 'Create Stripe checkout session with booking details',
    description:
      'Create a Stripe Checkout session with all booking details. Booking will be created in database only after successful payment.',
  })
  @ApiBody({
    type: CreateCheckoutWithBookingDto,
    description: 'Booking and checkout session details',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid booking details or room not available',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to create checkout session',
  })
  async createCheckoutWithBooking(
    @Body() createBookingDto: CreateCheckoutWithBookingDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckoutWithBooking(createBookingDto);
  }

  @Post('create-checkout-session')
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description:
      'Create a Stripe Checkout session for a pending booking. Returns a URL to redirect the user to complete payment.',
  })
  @ApiBody({
    type: CreateCheckoutSessionDto,
    description: 'Checkout session details',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid booking ID or booking not in pending status',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to create checkout session',
  })
  async createCheckoutSession(
    @Body() createSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckoutSession(createSessionDto);
  }

  @Post('stripe-webhook')
  @ApiOperation({
    summary: 'Handle Stripe webhooks',
    description:
      'Endpoint for Stripe to send webhook events. Handles payment confirmations and failures.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }

    await this.paymentsService.handleStripeWebhook(signature, request.rawBody);
    return { received: true };
  }

  @Get('success')
  @ApiOperation({
    summary: 'Get payment success details',
    description:
      'Retrieve payment success information using the Stripe session ID. Called after successful payment redirect.',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'Stripe checkout session ID from success URL',
    required: true,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment success details retrieved',
    type: PaymentSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing session ID',
  })
  async getPaymentSuccess(
    @Query('session_id') sessionId: string,
  ): Promise<PaymentSuccessResponseDto> {
    if (!sessionId) {
      throw new BadRequestException('session_id query parameter is required');
    }

    return this.paymentsService.getPaymentSuccess(sessionId);
  }

  @Get('cancel')
  @ApiOperation({
    summary: 'Handle payment cancellation',
    description:
      'Endpoint called when user cancels payment. Returns information about the cancelled session.',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'Stripe checkout session ID (optional)',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancellation handled',
  })
  handlePaymentCancel(@Query('session_id') sessionId?: string): {
    message: string;
    session_id?: string;
  } {
    return {
      message:
        'Payment was cancelled. You can retry payment or return to booking.',
      ...(sessionId && { session_id: sessionId }),
    };
  }
}
