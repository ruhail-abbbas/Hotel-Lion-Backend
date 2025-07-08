import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, IsEmail, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateCheckoutWithBookingDto {
  @ApiProperty({
    description: 'Room ID to book',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  room_id: string;

  @ApiProperty({
    description: 'Guest full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  guest_name: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  guest_email: string;

  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2025-07-15',
  })
  @IsDateString()
  @IsNotEmpty()
  check_in_date: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2025-07-17',
  })
  @IsDateString()
  @IsNotEmpty()
  check_out_date: string;

  @ApiProperty({
    description: 'Guest contact phone number (optional)',
    example: '+1-555-123-4567',
    required: false,
  })
  @IsString()
  @IsOptional()
  guest_contact?: string;

  @ApiProperty({
    description: 'Booking source',
    example: 'Website',
    required: false,
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    description: 'Number of adults',
    example: 2,
  })
  @IsInt()
  @Min(1)
  adults: number;

  @ApiProperty({
    description: 'Number of children/infants',
    example: 0,
  })
  @IsInt()
  @Min(0)
  infants: number;

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