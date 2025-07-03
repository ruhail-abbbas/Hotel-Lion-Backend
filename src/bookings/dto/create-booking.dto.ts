import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Room ID to book',
    example: 'room-uuid',
  })
  @IsString()
  @IsUUID('4', { message: 'room_id must be a valid UUID' })
  room_id: string;

  @ApiProperty({
    description: 'Guest full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'guest_name must be at least 2 characters long' })
  @MaxLength(100, { message: 'guest_name must not exceed 100 characters' })
  guest_name: string;

  @ApiProperty({
    description: 'Guest contact number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber(undefined, {
    message: 'guest_contact must be a valid phone number',
  })
  guest_contact?: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsEmail({}, { message: 'guest_email must be a valid email address' })
  guest_email: string;

  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString(
    {},
    { message: 'check_in_date must be a valid date (YYYY-MM-DD)' },
  )
  check_in_date: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2024-01-18',
  })
  @IsDateString(
    {},
    { message: 'check_out_date must be a valid date (YYYY-MM-DD)' },
  )
  check_out_date: string;

  @ApiProperty({
    description: 'Booking source (optional)',
    example: 'Website',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'source must not exceed 50 characters' })
  source?: string;
}
