# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend for Hotel Lion - a boutique hotel (max 16 rooms) PMS with channel management. Key focus: direct bookings with lower prices than OTAs, automated operations, legal compliance.

**Initial Rooms**: Y1A, Y1B, Y2, Y3A, Y3B, Y4, B1-B8 (14 rooms configured ✅)

## Current Implementation Status

✅ **Fully Implemented**: Authentication, User Management, Statistics, WhatsApp Integration, Database Schema  
🚧 **Database Ready**: Rooms, Bookings, Payments, Admin Dashboard, Channel Integration  
❌ **Not Started**: Public booking flow, Payment processing, Channel sync, Registration forms

## Development Commands.

* `pnpm run start:dev` – Dev server with hot reload
* `pnpm run build` – Production build
* `pnpm run lint` – ESLint (with pre-push hook ✅)
* `pnpm run format` – Prettier (with pre-push hook ✅)
* `pnpm run test` – Unit tests
* `pnpm run test:e2e` – E2E tests (auth module ✅)
* `pnpm run generate:openapi` – Export OpenAPI spec
* `pnpm run db:seed` – Seed database with initial data ✅

## Architecture

### Core Modules

**Authentication** ✅: JWT-based auth with refresh tokens, role-based access control (admin/staff), secure token rotation

**User Management** ✅: Complete CRUD operations, admin-only endpoints, user-hotel associations, password hashing

**Statistics** ✅: Occupancy rate calculation, monthly revenue analysis, ADR tracking, booking trends (24-month history)

**WhatsApp Integration** ✅: Twilio-based messaging, phone validation, error handling for sender configuration

**Rooms** 🚧: CRUD, image gallery, availability check, status management (available/out_of_service/cleaning) - *Database ready, public listing ✅, other endpoints pending*

**Bookings** 🚧: Search, create with payment, confirmation flow, status: pending→confirmed, seat-locking - *Database ready, endpoints pending*

**Payments** 🚧: Stripe/PayPal integration, tokenized/webhook-based, idempotent processing - *Database ready, endpoints pending*

**Admin** 🚧:
- Dashboard: stats, occupancy, check-ins/outs - *Statistics API ready*
- Calendar: month grid (rooms×dates), click for details/actions - *Database ready*
- Bookings: list/filter/export CSV - *Database ready*
- Rooms: visual cards, modal editing - *Database ready*
- Prices: channel matrix (Website<Airbnb<Booking.com) - *Rate rules in database*
- Customers: guest list, registration PDFs - *Database ready*
- Cleaning: 9:30AM auto-schedule, WhatsApp dispatch, staff management - *✅ Fully implemented*

**Channels** 🚧: Real-time 2-way sync (Airbnb/Booking.com), prevents double-booking - *Database ready*

**Notifications** 🚧: Email confirmations, WhatsApp (arrival guide, cleaning schedules), access codes - *WhatsApp integration ready*

**Registration** 🚧: Legal compliance form, generates room access code on completion - *Database ready*

**Communications** 🚧: Routes all channel messages to owner's WhatsApp - *WhatsApp integration ready*

## API Endpoints

### Authentication
- `POST /api/v1/auth/sign-in` – Login with credentials
- `GET /api/v1/auth/me` – Get current user (JWT required)
- `POST /api/v1/auth/refresh` – Refresh access token
- `POST /api/v1/auth/sign-out` – Logout and invalidate tokens

### Public
- `GET /api/v1/rooms?hotel_id=` – List all available rooms ✅
- `GET /api/v1/rooms/:id` – Room details 🚧
- `GET /api/v1/rooms/availability?start=&end=` – Check availability 🚧
- `POST /api/v1/bookings/search` – Check availability/pricing 🚧
- `POST /api/v1/bookings` – Create booking 🚧
- `GET /api/v1/bookings/:ref` – Booking summary 🚧
- `POST /api/v1/payments/stripe-intent` – Payment processing 🚧
- `POST /api/v1/payments/paypal-order` – Payment processing 🚧
- `POST /api/v1/payments/webhook` – Payment webhooks 🚧
- `GET /api/v1/registration/:bookingRef` – Registration form 🚧
- `POST /api/v1/registration/:bookingRef` – Submit registration 🚧

### Admin (JWT-protected)
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/calendar?month=&year=`
- `GET /api/v1/admin/bookings` + CRUD operations
- `GET /api/v1/admin/rooms` + CRUD operations
- `GET/PATCH /api/v1/admin/prices`
- `GET /api/v1/admin/customers`
- `GET /api/v1/admin/cleaning-schedule?date=`
- `POST /api/v1/admin/cleaning-schedule/send`

### User Management (Admin only) ✅
- `POST /api/v1/admin/users` – Create new user
- `GET /api/v1/admin/users` – List all users
- `GET /api/v1/admin/users/:id` – Get user details
- `PATCH /api/v1/admin/users/:id` – Update user
- `DELETE /api/v1/admin/users/:id` – Delete user

### Statistics (Admin only) ✅ *NEW*
- `GET /api/v1/admin/stats/occupancy-rate?start=&end=` – Calculate occupancy percentage
- `GET /api/v1/admin/stats/monthly-revenue?year=` – Monthly revenue breakdown
- `GET /api/v1/admin/stats/average-daily-rate?start=&end=` – ADR calculation
- `GET /api/v1/admin/stats/booking-trends?months=` – Booking trends analysis
- `GET /api/v1/admin/stats/checkins-today?date=` – Today's check-ins list
- `GET /api/v1/admin/stats/rooms-status?date=` – Room status with booking details

### WhatsApp Integration ✅ *NEW*
- `POST /api/v1/whatsapp/send-message` – Send WhatsApp message via Twilio

### Cleaning Management ✅ *NEW*
- `GET /api/v1/admin/cleaning/staff` – Get list of all cleaning staff members
- `POST /api/v1/admin/cleaning/send-notifications` – Manually trigger cleaning notifications

### Rate Rules Management (Admin only) ✅ *NEW*
- `POST /api/v1/rate-rules` – Create new premium rate rule
- `GET /api/v1/rate-rules?room_id=&hotel_id=&source=` – List rate rules with filtering
- `GET /api/v1/rate-rules/:id` – Get specific rate rule details
- `PUT /api/v1/rate-rules/:id` – Update existing rate rule
- `DELETE /api/v1/rate-rules/:id` – Delete rate rule

### Airbnb Calendar Integration ✅ *NEW*
- `POST /api/v1/airbnb/calendar` – Fetch Airbnb listing calendar data via Apify API
- `POST /api/v1/airbnb/listings` – Create/store new Airbnb listing URL for a room
- `GET /api/v1/airbnb/listings?hotel_id=` – Get all Airbnb listings for a hotel
- `GET /api/v1/airbnb/listings?room_id=` – Get all Airbnb listings for a specific room
- `PUT /api/v1/airbnb/listings/:id` – Update an existing Airbnb listing
- `DELETE /api/v1/airbnb/listings/:id` – Delete (soft delete) an Airbnb listing

### Performance Monitoring (Admin only) ✅ *NEW*
- `GET /api/v1/admin/monitoring/performance/overview` – Performance overview and health status
- `GET /api/v1/admin/monitoring/performance/operations` – Slowest operations statistics
- `GET /api/v1/admin/monitoring/performance/endpoints` – Endpoint performance metrics
- `GET /api/v1/admin/monitoring/performance/operation/:operation` – Specific operation stats
- `GET /api/v1/admin/monitoring/database/metrics` – Database performance metrics
- `GET /api/v1/admin/monitoring/health` – System health status
- `GET /api/v1/admin/monitoring/cleanup` – Cleanup old performance metrics

## API Path Structure & Design Decisions

### Rate Rules Path Decision ✅
**Path**: `/api/v1/rate-rules` (NOT `/api/v1/admin/rate-rules`)

**Rationale**:
- Admin-only access enforced via JWT authentication + role guards (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`)
- Maintains RESTful design principles
- Consistent with resource-based API architecture
- Avoids redundant path prefixes when security is handled at middleware level

**Frontend Integration Note**: 
- Frontend must use `/api/v1/rate-rules` for all rate rule operations
- Supported query parameters: `room_id`, `hotel_id`, `source`
- Authentication required: Bearer JWT token with admin role

### Architectural Consistency
- **Resource-based paths**: `/api/v1/{resource}` for business entities
- **Admin-specific operations**: `/api/v1/admin/{operation}` for administrative functions
- **Security**: Authentication/authorization handled by guards, not path structure

## Key Workflows

1. **Authentication**: Sign-in→JWT tokens→Protected access→Token refresh
2. **User Management**: Create users via admin→Associate with hotels→Role-based access
3. **Booking**: Search→Lock dates→Payment→Confirm→Send guides
4. **Registration**: Email link→Form submission→Access code generation
5. **Channel Sync**: Any booking blocks all channels instantly
6. **Cleaning**: Daily 9:30AM cron job→Query today's checkouts→WhatsApp to cleaning staff with room details
7. **Message Routing**: All channels→Owner's WhatsApp

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=...

# Payments (not yet implemented)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PAYPAL_CLIENT_ID=...

# WhatsApp Integration (via Twilio) ✅
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Cleaning Staff Notifications ✅
CLEANING_STAFF_NUMBERS=+1234567890,+0987654321

# Channel Integrations (not yet implemented)
AIRBNB_API_KEY=...
BOOKING_COM_API_KEY=...

# General
OWNER_WHATSAPP_NUMBER=...

# Airbnb Calendar Integration ✅
APIFY_API_TOKEN=...
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
