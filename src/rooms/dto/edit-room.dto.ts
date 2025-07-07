import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export enum RoomStatus {
  AVAILABLE = 'available',
  OUT_OF_SERVICE = 'out_of_service',
  CLEANING = 'cleaning',
}

export class EditRoomDto {
  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
    required: false,
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'name must be at least 1 character long' })
  @MaxLength(50, { message: 'name must not exceed 50 characters' })
  name?: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Cozy single room with city view and modern amenities',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Room size in square meters',
    example: 25,
    required: false,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt({ message: 'size_sqm must be an integer' })
  @Min(1, { message: 'size_sqm must be at least 1 square meter' })
  @Max(500, { message: 'size_sqm must not exceed 500 square meters' })
  size_sqm?: number;

  @ApiProperty({
    description: 'Bed setup description',
    example: '1 Queen Bed',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'bed_setup must not exceed 100 characters' })
  bed_setup?: string;

  @ApiProperty({
    description: 'Base price per night in cents (for website/direct bookings)',
    example: 12000,
    required: false,
    minimum: 100,
    maximum: 10000000,
  })
  @IsOptional()
  @IsInt({ message: 'base_price must be an integer' })
  @IsPositive({ message: 'base_price must be a positive number' })
  @Min(100, { message: 'base_price must be at least 100 cents ($1)' })
  @Max(10000000, {
    message: 'base_price must not exceed 10000000 cents ($100,000)',
  })
  base_price?: number;

  @ApiProperty({
    description:
      'Airbnb price per night in cents (optional - defaults to base_price if not set)',
    example: 13000,
    required: false,
    minimum: 100,
    maximum: 10000000,
  })
  @IsOptional()
  @IsInt({ message: 'airbnb_price must be an integer' })
  @IsPositive({ message: 'airbnb_price must be a positive number' })
  @Min(100, { message: 'airbnb_price must be at least 100 cents ($1)' })
  @Max(10000000, {
    message: 'airbnb_price must not exceed 10000000 cents ($100,000)',
  })
  airbnb_price?: number;

  @ApiProperty({
    description:
      'Booking.com price per night in cents (optional - defaults to base_price if not set)',
    example: 14000,
    required: false,
    minimum: 100,
    maximum: 10000000,
  })
  @IsOptional()
  @IsInt({ message: 'booking_com_price must be an integer' })
  @IsPositive({ message: 'booking_com_price must be a positive number' })
  @Min(100, { message: 'booking_com_price must be at least 100 cents ($1)' })
  @Max(10000000, {
    message: 'booking_com_price must not exceed 10000000 cents ($100,000)',
  })
  booking_com_price?: number;

  @ApiProperty({
    description: 'Maximum guest capacity',
    example: 2,
    required: false,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt({ message: 'max_capacity must be an integer' })
  @Min(1, { message: 'max_capacity must be at least 1' })
  @Max(20, { message: 'max_capacity must not exceed 20' })
  max_capacity?: number;

  @ApiProperty({
    description: 'Room status',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: 'status must be one of: available, out_of_service, cleaning',
  })
  status?: RoomStatus;

  @ApiProperty({
    description: 'Room amenities (array of strings)',
    example: [
      'WiFi',
      'Air Conditioning',
      'TV',
      'Private Bathroom',
      'Mini Fridge',
    ],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'amenities must be an array' })
  @IsString({ each: true, message: 'each amenity must be a string' })
  @MaxLength(50, {
    each: true,
    message: 'each amenity must not exceed 50 characters',
  })
  amenities?: string[];

  @ApiProperty({
    description: 'Pet fee in cents',
    example: 2500,
    required: false,
    minimum: 0,
    maximum: 1000000,
  })
  @IsOptional()
  @IsInt({ message: 'pet_fee must be an integer' })
  @Min(0, { message: 'pet_fee must be at least 0' })
  @Max(1000000, {
    message: 'pet_fee must not exceed 1000000 cents ($10,000)',
  })
  pet_fee?: number;

  @ApiProperty({
    description: 'Minimum nights required for booking',
    example: 2,
    required: false,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt({ message: 'minimum_nights must be an integer' })
  @Min(1, { message: 'minimum_nights must be at least 1' })
  @Max(365, { message: 'minimum_nights must not exceed 365' })
  minimum_nights?: number;

  @ApiProperty({
    description: 'Cleaning fee in cents',
    example: 5000,
    required: false,
    minimum: 0,
    maximum: 1000000,
  })
  @IsOptional()
  @IsInt({ message: 'cleaning_fee must be an integer' })
  @Min(0, { message: 'cleaning_fee must be at least 0' })
  @Max(1000000, {
    message: 'cleaning_fee must not exceed 1000000 cents ($10,000)',
  })
  cleaning_fee?: number;
}

export class EditRoomResponseDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
  })
  name: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Cozy single room with city view and modern amenities',
  })
  description: string;

  @ApiProperty({
    description: 'Room size in square meters',
    example: 25,
  })
  size_sqm: number;

  @ApiProperty({
    description: 'Bed setup description',
    example: '1 Queen Bed',
  })
  bed_setup: string;

  @ApiProperty({
    description: 'Base price per night in cents (for website/direct bookings)',
    example: 12000,
  })
  base_price: number;

  @ApiProperty({
    description: 'Airbnb price per night in cents',
    example: 13000,
    nullable: true,
  })
  airbnb_price?: number;

  @ApiProperty({
    description: 'Booking.com price per night in cents',
    example: 14000,
    nullable: true,
  })
  booking_com_price?: number;

  @ApiProperty({
    description: 'Maximum guest capacity',
    example: 2,
  })
  max_capacity: number;

  @ApiProperty({
    description: 'Room status',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
  })
  status: string;

  @ApiProperty({
    description: 'Room amenities',
    example: [
      'WiFi',
      'Air Conditioning',
      'TV',
      'Private Bathroom',
      'Mini Fridge',
    ],
  })
  amenities: string[];

  @ApiProperty({
    description: 'Pet fee in cents',
    example: 2500,
    nullable: true,
  })
  pet_fee?: number;

  @ApiProperty({
    description: 'Minimum nights required for booking',
    example: 2,
    nullable: true,
  })
  minimum_nights?: number;

  @ApiProperty({
    description: 'Cleaning fee in cents',
    example: 5000,
    nullable: true,
  })
  cleaning_fee?: number;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-10T10:30:00.000Z',
  })
  updated_at: string;
}
