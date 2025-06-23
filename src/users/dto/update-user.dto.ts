import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'admin@hotel-lion.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 8 characters)',
    example: 'newpassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.staff,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
