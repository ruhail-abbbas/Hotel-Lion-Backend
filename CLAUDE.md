# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend for Hotel Lion - a boutique hotel (max 16 rooms) PMS with channel management. Key focus: direct bookings with lower prices than OTAs, automated operations, legal compliance.

**Initial Rooms**: Y1A, Y1B, Y2, Y3A, Y3B, Y4, B1-B8

## Development Commands

* `pnpm run start:dev` – Dev server with hot reload
* `pnpm run build` – Production build
* `pnpm run lint` – ESLint
* `pnpm run format` – Prettier
* `pnpm run test` – Unit tests
* `pnpm run test:e2e` – E2E tests

## Architecture

### Core Modules

**Rooms**: CRUD, image gallery, availability check, status management (available/out_of_service/cleaning)

**Bookings**: Search, create with payment, confirmation flow, status: pending→confirmed, seat-locking

**Payments**: Stripe/PayPal integration, tokenized/webhook-based, idempotent processing

**Admin**:
- Dashboard: stats, occupancy, check-ins/outs
- Calendar: month grid (rooms×dates), click for details/actions
- Bookings: list/filter/export CSV
- Rooms: visual cards, modal editing
- Prices: channel matrix (Website<Airbnb<Booking.com)
- Customers: guest list, registration PDFs
- Cleaning: 9:30AM auto-schedule, WhatsApp dispatch, staff management

**Channels**: Real-time 2-way sync (Airbnb/Booking.com), prevents double-booking

**Notifications**: Email confirmations, WhatsApp (arrival guide, cleaning schedules), access codes

**Registration**: Legal compliance form, generates room access code on completion

**Communications**: Routes all channel messages to owner's WhatsApp

## API Endpoints

### Authentication
- `POST /api/v1/auth/sign-in` – Login with credentials
- `GET /api/v1/auth/me` – Get current user (JWT required)
- `POST /api/v1/auth/refresh` – Refresh access token
- `POST /api/v1/auth/sign-out` – Logout and invalidate tokens

### Public
- `GET /api/v1/rooms` – List rooms
- `GET /api/v1/rooms/:id` – Room details
- `GET /api/v1/rooms/availability?start=&end=`
- `POST /api/v1/bookings/search` – Check availability/pricing
- `POST /api/v1/bookings` – Create booking
- `GET /api/v1/bookings/:ref` – Booking summary
- `POST /api/v1/payments/stripe-intent`
- `POST /api/v1/payments/paypal-order`
- `POST /api/v1/payments/webhook`
- `GET /api/v1/registration/:bookingRef` – Registration form
- `POST /api/v1/registration/:bookingRef` – Submit registration

### Admin (JWT-protected)
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/calendar?month=&year=`
- `GET /api/v1/admin/bookings` + CRUD operations
- `GET /api/v1/admin/rooms` + CRUD operations
- `GET/PATCH /api/v1/admin/prices`
- `GET /api/v1/admin/customers`
- `GET /api/v1/admin/cleaning-schedule?date=`
- `POST /api/v1/admin/cleaning-schedule/send`

### User Management (Admin only)
- `POST /api/v1/admin/users` – Create new user
- `GET /api/v1/admin/users` – List all users
- `GET /api/v1/admin/users/:id` – Get user details
- `PATCH /api/v1/admin/users/:id` – Update user
- `DELETE /api/v1/admin/users/:id` – Delete user

## Key Workflows

1. **Authentication**: Sign-in→JWT tokens→Protected access→Token refresh
2. **User Management**: Create users via admin→Associate with hotels→Role-based access
3. **Booking**: Search→Lock dates→Payment→Confirm→Send guides
4. **Registration**: Email link→Form submission→Access code generation
5. **Channel Sync**: Any booking blocks all channels instantly
6. **Cleaning**: Daily 9:30AM query→WhatsApp to staff (multi-language)
7. **Message Routing**: All channels→Owner's WhatsApp

## Environment Variables

```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PAYPAL_CLIENT_ID=...
WHATSAPP_API_KEY=...
OWNER_WHATSAPP_NUMBER=...
AIRBNB_API_KEY=...
BOOKING_COM_API_KEY=...
JWT_SECRET=...
```

## OpenAPI Integration

**CRITICAL**: After API changes:
1. OpenAPI spec auto-generates from NestJS decorators
2. Access at `/api-json`
3. Run `pnpm run generate:openapi` to export
4. Commit `openapi.json` for frontend codegen

## Technical Requirements

- All DTOs use class-validator
- Dates in ISO 8601 UTC
- Money in cents (avoid decimals)
- Pagination: limit/offset pattern
- Response times: availability <100ms, booking <500ms
- JWT auth on admin endpoints (15 min access tokens, 7 day refresh)
- Rate limiting on public endpoints
- Webhook signature verification
- Password hashing with bcrypt (10 salt rounds)
- Role-based access control (admin/staff)
- Refresh token rotation and cleanup

## Database

See `CLAUDE_DB.md` for schema details. Key points:
- Prisma ORM with PostgreSQL
- Soft deletes for audit trail
- Indexes on booking dates, room availability

## User Creation

Since there's no public sign-up, users must be created via:
1. Admin using the `/api/v1/admin/users` endpoint
2. Database seed scripts for initial admin user
3. Direct database insertion for first admin setup

Example initial admin creation:
```sql
-- First, create a hotel
INSERT INTO hotels (id, name, location) VALUES ('uuid-here', 'Hotel Lion', 'Your Location');

-- Create admin user (password: 'admin123' hashed)
INSERT INTO users (id, email, password_hash, role) VALUES ('uuid-here', 'admin@hotel-lion.com', '$2b$10$...', 'admin');

-- Associate user with hotel
INSERT INTO hotel_users_pivot (id, user_id, hotel_id) VALUES ('uuid-here', 'user-uuid', 'hotel-uuid');
```

---

> **Note**: Focus on backend implementation. Frontend is a separate repository.