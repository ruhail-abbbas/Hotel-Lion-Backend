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

## Key Workflows

1. **Booking**: Search→Lock dates→Payment→Confirm→Send guides
2. **Registration**: Email link→Form submission→Access code generation
3. **Channel Sync**: Any booking blocks all channels instantly
4. **Cleaning**: Daily 9:30AM query→WhatsApp to staff (multi-language)
5. **Message Routing**: All channels→Owner's WhatsApp

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
- JWT auth on admin endpoints
- Rate limiting on public endpoints
- Webhook signature verification

## Database

See `CLAUDE_DB.md` for schema details. Key points:
- Prisma ORM with PostgreSQL
- Soft deletes for audit trail
- Indexes on booking dates, room availability

---

> **Note**: Focus on backend implementation. Frontend is a separate repository.