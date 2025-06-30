import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RoomStatus {
  AVAILABLE = 'available',
  OUT_OF_SERVICE = 'out_of_service',
  CLEANING = 'cleaning',
}

export class UpdateRoomStatusDto {
  @ApiProperty({
    description: 'Room status',
    enum: RoomStatus,
    example: RoomStatus.OUT_OF_SERVICE,
  })
  @IsEnum(RoomStatus, {
    message: 'status must be one of: available, out_of_service, cleaning',
  })
  status: RoomStatus;

  @ApiProperty({
    description: 'Optional notes about the status change',
    example:
      'Room taken out of service for maintenance - air conditioning repair',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes must not exceed 500 characters' })
  notes?: string;
}

export class RoomStatusResponseDto {
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
    description: 'Previous room status',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
  })
  previous_status: RoomStatus;

  @ApiProperty({
    description: 'New room status',
    enum: RoomStatus,
    example: RoomStatus.OUT_OF_SERVICE,
  })
  new_status: RoomStatus;

  @ApiProperty({
    description: 'Status change notes',
    example:
      'Room taken out of service for maintenance - air conditioning repair',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'Timestamp when status was updated',
    example: '2025-06-30T11:15:00.000Z',
  })
  updated_at: string;
}
