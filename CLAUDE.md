# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS-based backend application for the Hotel Lion project. It's a fresh NestJS TypeScript starter with minimal configuration and a basic controller/service architecture.

## Development Commands

### Package Management
- `pnpm install` - Install dependencies
- `pnpm install <package>` - Add new package

### Development Server
- `pnpm run start:dev` - Start development server with watch mode (recommended for development)
- `pnpm run start` - Start server without watch mode
- `pnpm run start:debug` - Start with debug mode and watch
- `pnpm run start:prod` - Start production server (requires build first)

### Build and Compilation
- `pnpm run build` - Build the application for production
- Built files are output to `dist/` directory

### Code Quality
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- ESLint configured with TypeScript, Prettier integration, and custom rules (some TypeScript strict checks set to warn/off)
- Prettier configured with single quotes and trailing commas

### Testing
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Run tests with coverage report
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:debug` - Run tests in debug mode
- `pnpm run test -- <test-name>` - Run specific test file

## Architecture

### Project Structure
- `src/` - Source code directory
  - `main.ts` - Application entry point, bootstraps NestJS app on port 3000 (or PORT env var)
  - `app.module.ts` - Root application module
  - `app.controller.ts` - Main application controller with basic GET endpoint
  - `app.service.ts` - Main application service with Hello World logic
- `test/` - End-to-end test files
- `dist/` - Compiled output directory (created after build)

### NestJS Configuration
- Uses CommonJS modules (`tsconfig.json`)
- Decorators enabled for NestJS dependency injection
- Source root configured as `src/` directory
- TypeScript compilation target: ES2023

### Testing Setup
- Jest for unit testing with ts-jest transformer
- Supertest for e2e testing
- Test files follow `*.spec.ts` pattern for unit tests
- E2E tests in separate `test/` directory
- Coverage reports generated to `coverage/` directory

## Key Dependencies
- **Runtime**: @nestjs/common, @nestjs/core, @nestjs/platform-express, @prisma/client
- **Database**: Prisma ORM with PostgreSQL
- **API Documentation**: @nestjs/swagger, swagger-ui-express
- **Development**: TypeScript, ESLint, Prettier, Jest
- **Testing**: @nestjs/testing, supertest, ts-jest

## Database & Prisma
- PostgreSQL database with Prisma ORM
- Database name: `hotel_lion`
- Connection configured via `DATABASE_URL` in .env
- Schema defined in `prisma/schema.prisma`
- Run `npx prisma migrate dev` to apply schema changes
- Run `npx prisma generate` to update client types

## API Documentation
- Swagger UI available at `/api` when server is running
- Automatically documents all endpoints with OpenAPI 3.0 specification
- Includes tags for different API sections: hotels, rooms, bookings, payments, users

## Port Configuration
Application runs on port 3000 by default, configurable via `PORT` environment variable.