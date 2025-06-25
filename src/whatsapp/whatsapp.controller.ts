import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/whatsapsedp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('send-message')
  @ApiOperation({ summary: 'Send WhatsApp message via Twilio' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto): Promise<{
    success: boolean;
    messageSid: string;
    status: string;
  }> {
    return await this.whatsAppService.sendMessage(
      sendMessageDto.to,
      sendMessageDto.message,
    );
  }
}
