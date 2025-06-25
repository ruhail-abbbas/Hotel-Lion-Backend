import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description:
      'WhatsApp phone number in international format (without whatsapp: prefix)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +1234567890)',
  })
  to: string;

  @ApiProperty({
    description: 'Message content to send',
    example: 'Hello! Your booking confirmation is ready.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
