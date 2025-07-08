import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { StatsModule } from './stats/stats.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { HotelsModule } from './hotels/hotels.module';
import { CleaningModule } from './cleaning/cleaning.module';
import { AirbnbModule } from './airbnb/airbnb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    WhatsAppModule,
    StatsModule,
    RoomsModule,
    BookingsModule,
    HotelsModule,
    CleaningModule,
    AirbnbModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
