# CLAUDE_DATABASE.md

This document provides guidance to Claude Code (claude.ai/code) on the database schema, entities, and relationships for the Hotel Lion backend. It reflects the current Prisma schema implementation.

## Overview

* **Database**: PostgreSQL ✅
* **ORM**: Prisma ✅
* **Status**: Complete schema implemented with migrations ✅
* **Purpose**: Support room management, bookings, payments, rate rules, blocked dates, reviews, photos, user access, and operational automations (cleaning schedules, channel sync).

## Core Entities & Tables

### Users ✅

* **Columns**: `id` (UUID PK), `email` (unique), `phone`, `password_hash`, `role` (`admin` | `staff`), timestamps
* **Relationships**: 
  - Many-to-many with `Hotel` via `HotelUsersPivot` (manages user access per hotel)
  - One-to-many with `RefreshToken` (JWT token management)

### Hotel ✅

* **Columns**: `id` (UUID PK), `name`, `location`, `contact_info` (JSONB), `policies`, `default_checkin_time`, `default_checkout_time`, timestamps
* **Relationships**: 
  - One-to-many to `Room`
  - Many-to-many with `User` via `HotelUsersPivot`

### HotelUsersPivot ✅

* **Columns**: `id` (UUID PK), `user_id` (FK → User.id), `hotel_id` (FK → Hotel.id)
* **Purpose**: Associates `User` with `Hotel` entities for access control across multiple hotels; ensures admins/staff only manage assigned properties.
* **Constraints**: Unique constraint on `(user_id, hotel_id)`

### Room ✅

* **Columns**: `id` (UUID PK), `hotel_id` FK, `name`, `description`, `size_sqm`, `bed_setup`, `base_price` (cents), `max_capacity`, `status` (`available` | `out_of_service` | `cleaning`), `amenities` (JSONB), timestamps
* **Relationships**:
  - One-to-many: `Booking`, `BlockedDate`, `RoomPhoto`, `RateRule`, `Review`
  - Many-to-one: `Hotel`

### Booking ✅

* **Columns**: `id` (UUID PK), `room_id` FK, `reference_number` (unique), `guest_name`, `guest_contact`, `guest_email`, `check_in_date`, `check_out_date`, `total_cost` (cents), `status` (`pending` | `confirmed` | `cancelled`), `source`, timestamps
* **Relationships**:
  - One-to-many: `Payment`
  - One-to-one: `Review` (optional)
  - Many-to-one: `Room`

### Payment ✅

* **Columns**: `id` (UUID PK), `booking_id` FK, `amount` (cents), `payment_method` (`Card` | `Cash`), `identifier`, `created_at`
* **Relationships**: Many-to-one with `Booking`

### BlockedDate ✅

* **Columns**: `id` (UUID PK), `room_id` FK, `blocked_date`, `notes`, `created_at`
* **Constraints**: Unique on `(room_id, blocked_date)`
* **Index**: `(room_id, blocked_date)`

## Supporting Entities

### RoomPhoto ✅

* **Columns**: `id` (UUID PK), `room_id` FK, `image_url`, `sort_order`
* **Purpose**: Image gallery support for room listings

### RateRule ✅

* **Columns**: `id` (UUID PK), `room_id` FK, `start_date`, `end_date`, `price_per_night` (cents), `min_stay_nights`, `day_of_week` (int[]), `source`
* **Index**: `(room_id, start_date, end_date)`
* **Purpose**: Dynamic pricing rules based on date ranges and day-of-week patterns

### Review ✅

* **Columns**: `id` (UUID PK), `booking_id` FK (unique), `room_id` FK, `rating` (1-5), `comment`, `is_published`, `created_at`
* **Purpose**: Guest review system with publishing controls

### RefreshToken ✅ *NEW*

* **Columns**: `id` (UUID PK), `token` (unique), `user_id` FK, `expires_at`, `created_at`
* **Purpose**: Secure JWT refresh token management with rotation
* **Index**: `(user_id)`

## Enums ✅

* `UserRole`: `admin`, `staff`
* `PaymentMethod`: `Card`, `Cash`
* `RoomStatus`: `available`, `out_of_service`, `cleaning`
* `BookingStatus`: `pending`, `confirmed`, `cancelled`
* `AdjustmentType`: `percentage`, `fixed`

## Relationships Diagram

```
Users ←→ HotelUsersPivot ←→ Hotel → Room → Booking → Payment
  ↓                                  ↓       ↓
RefreshToken                    RoomPhoto   Review
                                     ↓
                               BlockedDate
                                     ↓
                                RateRule
```

## Business Logic Patterns

* **Availability Check**: `Room.status = 'available'`, no conflicting `BlockedDate`, no overlapping `Booking` with status `pending` or `confirmed`.
* **Pricing Calculation**: Evaluate `RateRule` for date range and day-of-week; apply channel source priority; fallback to `Room.base_price`.
* **Booking Workflow**:
  1. Insert `Booking` with status `pending`
  2. Process `Payment`
  3. Update `Booking.status` to `confirmed`
  4. Trigger notifications (email, WhatsApp guide)
* **Cleaning Schedule**: Daily query of check-outs and occupied rooms; integrate with WhatsApp service for staff dispatch.
* **Authentication**: JWT access tokens (15 min) + refresh tokens (7 days) with rotation and cleanup.

## Indexes & Performance ✅

* `rooms(hotel_id)`
* `bookings(room_id, status)`
* `bookings(reference_number)`
* `blocked_dates(room_id, blocked_date)`
* `rate_rules(room_id, start_date, end_date)`
* `refresh_tokens(user_id)`

## Database Configuration

* **Primary Keys**: UUID for all entities
* **Timestamps**: Automatic `created_at` and `updated_at` tracking
* **Money Fields**: All prices stored in cents (integer) to avoid decimal precision issues
* **Cascade Deletes**: Configured on all foreign key relationships
* **JSON Fields**: Used for flexible data (contact_info, amenities)

## Seed Data ✅

Current implementation includes:
* **Default Hotel**: "Hotel Lion" with policies and contact information
* **Admin User**: `admin@hotel-lion.com` / `admin123` (hashed)
* **14 Rooms**: Y1A, Y1B, Y2, Y3A, Y3B, Y4, B1-B8 with realistic pricing ($120-$150/night)
* **Room Amenities**: WiFi, AC, TV, private bathroom configurations

## Migrations & Prisma ✅

* **Schema File**: `prisma/schema.prisma` (fully configured)
* **Migration Command**: `npx prisma migrate dev`
* **Seed Command**: `pnpm run db:seed`
* **Client Generation**: Auto-generated TypeScript types

## Essential Notes

* **Data Integrity**: Unique constraints prevent overlapping bookings and duplicate blocks
* **Cascade Deletes**: Deleting a room removes all related bookings, photos, reviews, rate rules, and blocked dates
* **Price Storage**: All monetary values in cents to ensure precision
* **Authentication**: Refresh token rotation implemented for security
* **Multi-Hotel Support**: Schema supports multiple hotels per installation
* **Audit Trail**: Timestamps on all entities for operational tracking

## Current Implementation Status

✅ **Complete Schema**: All tables, relationships, and constraints implemented  
✅ **Seed Data**: Initial hotel, rooms, and admin user configured  
✅ **Migrations**: Database schema deployed and versioned  
✅ **Indexes**: Performance optimization for booking queries  
✅ **Types**: Full TypeScript integration via Prisma Client  

> **Note:** Database schema is production-ready. Focus on implementing API endpoints to leverage the complete data model.