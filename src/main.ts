import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { PerformanceInterceptor } from './monitoring/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global performance monitoring
  const performanceInterceptor = app.get(PerformanceInterceptor);
  app.useGlobalInterceptors(performanceInterceptor);

  // Serve static files from uploads directory
  // In production (dist/), __dirname is dist/src, so go up two levels to project root
  // In development, __dirname is src, so go up one level to project root
  const uploadsPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, '..', '..', 'uploads')
    : join(__dirname, '..', 'uploads');
  
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Frontend Next.js
      'http://localhost:8000', // Allow same origin
      /^https:\/\/hotel-lion-frontend-[a-zA-Z0-9]+-abbbas-projects\.vercel\.app$/,
      'https://hotel-lion-frontend.vercel.app',
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
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('User Management', 'Admin user management endpoints')
    .addTag('WhatsApp', 'WhatsApp messaging via Twilio')
    .addTag('hotels', 'Hotel management endpoints')
    .addTag('Rooms', 'Room inventory and availability')
    .addTag('Bookings', 'Reservation management')
    .addTag('Payments', 'Payment processing')
    .addTag('Rate Rules', 'Premium pricing rules management')
    .addTag('Monitoring', 'Performance monitoring and metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port);
  console.log(`🚀 Hotel Lion API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api`);
}
void bootstrap();
