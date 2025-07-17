import { ApiProperty } from '@nestjs/swagger';

export class CleaningStaffDto {
  @ApiProperty({
    description: 'Unique identifier for the cleaning staff member',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the cleaning staff member',
    example: 'cleaner@hotel-lion.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number for WhatsApp notifications',
    example: '+1234567890',
  })
  phone: string;
}

export class CleaningStaffResponseDto {
  @ApiProperty({
    description: 'List of cleaning staff members',
    type: [CleaningStaffDto],
  })
  staff: CleaningStaffDto[];

  @ApiProperty({
    description: 'Total number of cleaning staff members',
    example: 3,
  })
  total: number;
}
