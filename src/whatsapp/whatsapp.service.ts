import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendMessage(
    to: string,
    message: string,
  ): Promise<{
    success: boolean;
    messageSid: string;
    status: string;
  }> {
    try {
      const fromNumber = this.configService.get<string>(
        'TWILIO_WHATSAPP_NUMBER',
      );

      if (!fromNumber) {
        throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
      }

      this.logger.log(`Attempting to send message from ${fromNumber} to ${to}`);

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${to}`,
      });

      this.logger.log(
        `Message sent successfully to ${to}, SID: ${twilioMessage.sid}`,
      );
      return {
        success: true,
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to send message to ${to}:`, error);

      if ((error as { code?: number }).code === 63007) {
        throw new Error(
          'WhatsApp sender number not configured. Please check Twilio Console → WhatsApp → Sandbox settings or verify your WhatsApp Business number.',
        );
      }

      throw error;
    }
  }
}
