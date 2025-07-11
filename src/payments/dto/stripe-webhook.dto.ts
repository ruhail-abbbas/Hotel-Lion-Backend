import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookDto {
  @ApiProperty({
    description: 'Stripe webhook event type',
    example: 'checkout.session.completed',
  })
  type: string;

  @ApiProperty({
    description: 'Stripe webhook event data',
  })
  data: any;

  @ApiProperty({
    description: 'Stripe webhook event ID',
    example: 'evt_1234567890abcdef',
  })
  id: string;
}
