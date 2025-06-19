import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Hotel Lion API')
    .setDescription('Hotel booking system API for managing hotels, rooms, bookings, and payments')
    .setVersion('1.0')
    .addTag('hotels', 'Hotel management endpoints')
    .addTag('rooms', 'Room inventory and availability')
    .addTag('bookings', 'Reservation management')
    .addTag('payments', 'Payment processing')
    .addTag('users', 'User and authentication management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
