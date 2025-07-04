import { Module } from '@nestjs/common';
import { CleaningService } from './cleaning.service';
import { CleaningController } from './cleaning.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [CleaningController],
  providers: [CleaningService],
  exports: [CleaningService],
})
export class CleaningModule {}
