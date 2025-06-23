import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:8000',  // Your frontend
      'http://localhost:3000'   // Allow same origin
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Hotel Lion API')
    .setDescription(
      'Hotel booking system API for managing hotels, rooms, bookings, and payments',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme.',
      },
      'JWT-auth'
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('User Management', 'Admin user management endpoints')
    .addTag('hotels', 'Hotel management endpoints')
    .addTag('rooms', 'Room inventory and availability')
    .addTag('bookings', 'Reservation management')
    .addTag('payments', 'Payment processing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Hotel Lion API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api`);
}
bootstrap();
