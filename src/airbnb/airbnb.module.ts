import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AirbnbController } from './airbnb.controller';
import { AirbnbService } from './airbnb.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AirbnbController],
  providers: [AirbnbService],
  exports: [AirbnbService],
})
export class AirbnbModule {}
