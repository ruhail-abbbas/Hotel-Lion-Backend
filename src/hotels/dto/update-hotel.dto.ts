import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsUrl,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsObject,
  Matches,
} from 'class-validator';

export class ContactInfoDto {
  @ApiProperty({
    description: 'Hotel phone number',
    example: '+1 555-0199',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Hotel email address',
    example: 'info@hotellion.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Hotel website URL',
    example: 'https://hotellion.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;
}

export class UpdateHotelDto {
  @ApiProperty({
    description: 'Hotel name',
    example: 'Hotel Lion',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Hotel name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'Hotel address/location',
    example: '123 Boutique Street, City Center',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Location must not exceed 200 characters' })
  location?: string;

  @ApiProperty({
    description: 'Hotel contact information',
    type: ContactInfoDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  contact_info?: ContactInfoDto;

  @ApiProperty({
    description: 'Default check-in time (HH:MM format)',
    example: '15:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-in time must be in HH:MM format (e.g., 15:00)',
  })
  default_checkin_time?: string;

  @ApiProperty({
    description: 'Default check-out time (HH:MM format)',
    example: '11:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-out time must be in HH:MM format (e.g., 11:00)',
  })
  default_checkout_time?: string;

  @ApiProperty({
    description: 'Hotel policies and booking rules',
    example:
      'Cancellation allowed up to 24 hours before arrival. No smoking in rooms. Pets allowed with prior arrangement.',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Policies must not exceed 2000 characters' })
  policies?: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Currency must be a 3-letter code' })
  currency?: string;

  @ApiProperty({
    description: 'Tax rate percentage',
    example: 10,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tax rate must be a valid number' })
  @Min(0, { message: 'Tax rate cannot be negative' })
  @Max(100, { message: 'Tax rate cannot exceed 100%' })
  tax_rate?: number;
}

export class HotelResponseDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'hotel-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Hotel name',
    example: 'Hotel Lion',
  })
  name: string;

  @ApiProperty({
    description: 'Hotel location',
    example: '123 Boutique Street, City Center',
  })
  location: string;

  @ApiProperty({
    description: 'Hotel contact information',
    type: ContactInfoDto,
  })
  contact_info: ContactInfoDto;

  @ApiProperty({
    description: 'Default check-in time',
    example: '15:00',
  })
  default_checkin_time: string;

  @ApiProperty({
    description: 'Default check-out time',
    example: '11:00',
  })
  default_checkout_time: string;

  @ApiProperty({
    description: 'Hotel policies',
    example:
      'Cancellation allowed up to 24 hours before arrival. No smoking in rooms.',
  })
  policies: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Tax rate percentage',
    example: 10,
  })
  tax_rate: number;

  @ApiProperty({
    description: 'Hotel creation date',
    example: '2024-01-01T10:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Hotel last update date',
    example: '2025-06-30T12:00:00.000Z',
  })
  updated_at: string;
}
