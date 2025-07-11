import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RoomStatus {
  AVAILABLE = 'available',
  OUT_OF_SERVICE = 'out_of_service',
  CLEANING = 'cleaning',
}

export class CreateRoomDto {
  @ApiProperty({
    description: 'Hotel ID that this room belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  hotel_id: string;

  @ApiProperty({
    description: 'Room name',
    example: 'Y1A',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'name must be at least 1 character long' })
  @MaxLength(50, { message: 'name must not exceed 50 characters' })
  name: string;

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
    description: 'Base price per night in Euros (for website/direct bookings)',
    example: 120.00,
    minimum: 1,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'base_price must be a positive number' })
  @Min(1, { message: 'base_price must be at least 1 Euro' })
  @Max(100000, { message: 'base_price must not exceed 100000 Euros' })
  @Type(() => Number)
  base_price: number;

  @ApiProperty({
    description: 'Airbnb price per night in Euros (optional - defaults to base_price if not set)',
    example: 134.40,
    required: false,
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'airbnb_price must be a positive number' })
  @Min(1, { message: 'airbnb_price must be at least 1 Euro' })
  @Max(100000, { message: 'airbnb_price must not exceed 100000 Euros' })
  @Type(() => Number)
  airbnb_price?: number;

  @ApiProperty({
    description: 'Booking.com price per night in Euros (optional - defaults to base_price if not set)',
    example: 140.40,
    required: false,
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'booking_com_price must be a positive number' })
  @Min(1, { message: 'booking_com_price must be at least 1 Euro' })
  @Max(100000, { message: 'booking_com_price must not exceed 100000 Euros' })
  @Type(() => Number)
  booking_com_price?: number;

  @ApiProperty({
    description: 'Maximum guest capacity',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsInt({ message: 'max_capacity must be an integer' })
  @Min(1, { message: 'max_capacity must be at least 1' })
  @Max(20, { message: 'max_capacity must not exceed 20' })
  max_capacity: number;

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
    description: 'Pet fee in Euros',
    example: 25.00,
    required: false,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'pet_fee must be at least 0' })
  @Max(10000, { message: 'pet_fee must not exceed 10000 Euros' })
  @Type(() => Number)
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
    description: 'Cleaning fee in Euros',
    example: 50.00,
    required: false,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'cleaning_fee must be at least 0' })
  @Max(10000, { message: 'cleaning_fee must not exceed 10000 Euros' })
  @Type(() => Number)
  cleaning_fee?: number;
}

export class CreateRoomResponseDto {
  @ApiProperty({
    description: 'Room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Hotel ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  hotel_id: string;

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
    description: 'Base price per night in Euros',
    example: 120.00,
  })
  base_price: number;

  @ApiProperty({
    description: 'Airbnb price per night in Euros',
    example: 134.40,
    nullable: true,
  })
  airbnb_price?: number;

  @ApiProperty({
    description: 'Booking.com price per night in Euros',
    example: 140.40,
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
    description: 'Pet fee in Euros',
    example: 25.00,
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
    description: 'Cleaning fee in Euros',
    example: 50.00,
    nullable: true,
  })
  cleaning_fee?: number;

  @ApiProperty({
    description: 'Array of uploaded image URLs',
    example: ['/uploads/rooms/image1.jpg', '/uploads/rooms/image2.jpg'],
    type: [String],
  })
  image_urls: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-10T10:30:00.000Z',
  })
  created_at: string;
}