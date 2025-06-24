# CLAUDE\_DATABASE.md

This document provides guidance to Claude Code (claude.ai/code) on the database schema, entities, and relationships for the Hotel Lion backend. It is based on the DBML ERD and aligns with the PRDs for both guest-facing flows and admin panel features.

## Overview

* **Database**: PostgreSQL
* **ORM**: Prisma
* **Purpose**: Support room management, bookings, payments, rate rules, blocked dates, reviews, photos, user access, and operational automations (cleaning schedules, channel sync).

## Core Entities & Tables

### Users

* **Columns**: `id` (UUID PK), `email`, `phone`, `password_hash`, `role` (`admin` | `staff`), timestamps
* **Relationships**: Many-to-many with `Hotel` via `Hotel_Users_Pivot` (manages user access per hotel)

### Hotel

* **Columns**: `id` (UUID PK), `name`, `location`, `contact_info` (JSONB), `policies`, `default_checkin_time`, `default_checkout_time`
* **Relationships**: One-to-many to `Rooms`

### Hotel\_Users\_Pivot

* **Columns**: `id` (UUID PK), `user_id` (FK → Users.id), `hotel_id` (FK → Hotel.id)
* **Purpose**: Associates `Users` with `Hotel` entities for access control across multiple hotels; ensures admins/staff only manage assigned properties.

### Rooms

* **Columns**: `id` (UUID PK), `hotel_id` FK, `name`, `description`, `size_sqm`, `bed_setup`, `base_price`, `max_capacity`, `status` (`available` | `out_of_service` | `cleaning`), `amenities` (JSONB), timestamps
* **Relationships**:

  * One-to-many: `Bookings`, `BlockedDates`, `RoomPhotos`, `RateRules`, `Reviews`

### Bookings

* **Columns**: `id` (UUID PK), `room_id` FK, `reference_number`, `guest_name`, `guest_contact`, `guest_email`, `check_in_date`, `check_out_date`, `total_cost`, `status` (`pending` | `confirmed` | `cancelled`), `source`, timestamps
* **Relationships**:

  * One-to-many: `Payment`
  * One-to-one: `Review`

### Payment

* **Columns**: `id` (UUID PK), `booking_id` FK, `amount`, `payment_method` (`Card` | `Cash`), `identifier`

### BlockedDates

* **Columns**: `id` (UUID PK), `room_id` FK, `blocked_date`, `notes`, `created_at`
* **Index**: Unique on `(room_id, blocked_date)`

## Supporting Entities

### RoomPhotos

* **Columns**: `id` (UUID PK), `room_id` FK, `image_url`, `sort_order`

### RateRules

* **Columns**: `id` (UUID PK), `room_id` FK, `start_date`, `end_date`, `price_per_night`, `min_stay_nights`, `day_of_week` (int\[]), `source`
* **Index**: `(room_id, start_date, end_date)`

### Reviews

* **Columns**: `id` (UUID PK), `booking_id` FK (unique), `room_id` FK, `rating`, `comment`, `is_published`, `created_at`

## Enums

* `user_role`: `admin`, `staff`
* `payment_method`: `Card`, `Cash`
* `room_status`: `available`, `out_of_service`, `cleaning`
* `booking_status`: `pending`, `confirmed`, `cancelled`
* `adjustment_type`: `percentage`, `fixed`

## Relationships Diagram

```
Users ←→ Hotel_Users_Pivot ←→ Hotel → Rooms → Bookings → Payment
                               ↘                ↘ Reviews
                                ↘                ↘ BlockedDates
                                ↘                ↘ RoomPhotos
                                ↘                ↘ RateRules
```

## Business Logic Patterns

* **Availability Check**: Room.status = `available`, no `BlockedDates`, no overlapping `Bookings` (`pending`, `confirmed`).
* **Pricing Calculation**: Evaluate `RateRules` for date range and channel priority; fallback to `Rooms.base_price`.
* **Booking Workflow**:

  1. Insert `Bookings` with `pending`
  2. Process `Payment`
  3. Update `Bookings.status` to `confirmed`
  4. Trigger notifications (email, WhatsApp guide)
* **Cleaning Schedule**: Daily query of check-outs and occupied rooms; write to UI via API and dispatch WhatsApp via notifications service.

## Indexes & Performance

* `rooms(hotel_id)`
* `bookings(room_id, status)`
* `blocked_dates(room_id, blocked_date)`
* `rate_rules(room_id, start_date, end_date)`
* `bookings(reference_number)`

## Migrations & Prisma

* Use `npx prisma smigrate dev` to apply schema updates.
* `schema.prisma` models mirror tables and enums above.
* Enable `@updatedAt` for timestamp fields in Prisma.

## Essential Notes

* **Maintain Unique Constraints**: Prevent overlapping bookings and duplicate blocks.
* **Cascade Deletes**: Deleting a room cascades Bookings, Photos, Reviews, RateRules, BlockedDates.
* **Soft Deletes**: Implement via `status` flags if needed for historical data.

> **Note:** Core schema aligns with PRD requirements. Keep essential information intact when evolving the schema.
