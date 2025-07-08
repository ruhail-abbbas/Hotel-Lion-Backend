import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AirbnbModule } from '../airbnb/airbnb.module';

@Module({
  imports: [PrismaModule, AirbnbModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
