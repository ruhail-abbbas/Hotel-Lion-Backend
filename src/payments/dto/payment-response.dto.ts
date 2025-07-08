import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({
    description: 'Stripe Checkout Session ID',
    example: 'cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6',
  })
  session_id: string;

  @ApiProperty({
    description: 'Stripe Checkout Session URL',
    example: 'https://checkout.stripe.com/pay/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6',
  })
  checkout_url: string;

  @ApiProperty({
    description: 'Booking ID associated with this payment session',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  booking_id: string;
}

export class PaymentSuccessResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Payment completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Booking ID that was paid for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  booking_id: string;

  @ApiProperty({
    description: 'Payment amount in cents',
    example: 15000,
  })
  amount_paid: number;

  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_1234567890abcdef',
  })
  payment_intent_id: string;
}