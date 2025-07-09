import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Booking ID to create payment session for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  booking_id: string;

  @ApiProperty({
    description: 'Success URL to redirect to after successful payment',
    example: 'http://localhost:3000/payment/success',
  })
  @IsString()
  @IsNotEmpty()
  success_url: string;

  @ApiProperty({
    description: 'Cancel URL to redirect to if payment is cancelled',
    example: 'http://localhost:3000/payment/cancel',
  })
  @IsString()
  @IsNotEmpty()
  cancel_url: string;
}