import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UploadRoomImageDto {
  @ApiProperty({
    description: 'Sort order for the image (optional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sort_order?: number;
}

export class UpdateRoomImageOrderDto {
  @ApiProperty({
    description: 'New sort order for the image',
    example: 2,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  sort_order: number;
}

export class RoomImageUploadResponseDto {
  @ApiProperty({
    description: 'Image ID',
    example: 'image-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Room ID',
    example: 'room-uuid',
  })
  room_id: string;

  @ApiProperty({
    description: 'Image file path',
    example: '/uploads/rooms/room-uuid/image-uuid.jpg',
  })
  image_url: string;

  @ApiProperty({
    description: 'Sort order',
    example: 1,
  })
  sort_order: number;
}
