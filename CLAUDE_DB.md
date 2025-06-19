# Hotel Booking System Database Documentation

## Overview
This database manages a hotel booking system with support for multi-hotel management, room inventory, reservations, payments, and reviews. The system uses PostgreSQL with Prisma ORM.

## Database Schema Summary

### Core Entities
- **Users**: System administrators and staff
- **Hotels**: Hotel properties with policies and contact info
- **Rooms**: Individual room inventory with pricing and amenities
- **Bookings**: Guest reservations and stay details
- **Payments**: Payment records for bookings

### Supporting Entities
- **Rate Rules**: Dynamic pricing rules by date/season
- **Blocked Dates**: Room availability restrictions
- **Reviews**: Guest feedback and ratings
- **Room Photos**: Image galleries for rooms

## Table Relationships

```
Users ←→ HotelUser ←→ Hotels
Hotels → Rooms → Bookings → Payments
                → Reviews
                → RateRules
                → BlockedDates
                → RoomPhotos
```

## Detailed Schema

### Core Tables

#### `users`
User accounts for hotel staff and administrators.
- `id` (UUID, PK): Unique user identifier
- `email` (VARCHAR(255), UNIQUE): Login email
- `password_hash` (VARCHAR(255)): Bcrypt password hash
- `role` (ENUM): 'admin' | 'staff'
- `created_at`, `updated_at` (TIMESTAMP): Audit trails

#### `hotel`
Hotel property information and configuration.
- `id` (UUID, PK): Hotel identifier
- `name` (VARCHAR(255)): Hotel display name
- `location` (VARCHAR(255)): Physical address/location
- `contact_info` (JSONB): Phone, email, website details
- `policies` (TEXT): Check-in rules, cancellation policy
- `default_checkin_time`, `default_checkout_time` (TIME): Standard times

#### `hotel_users_pivot`
Many-to-many relationship between users and hotels.
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `hotel_id` (UUID, FK → hotel.id)

#### `rooms`
Individual room inventory with base configuration.
- `id` (UUID, PK): Room identifier
- `hotel_id` (UUID, FK → hotel.id): Parent hotel
- `name` (VARCHAR(255), UNIQUE): Room name/number
- `description` (TEXT): Room description
- `size_sqm` (INT): Room size in square meters
- `bed_setup` (VARCHAR(100)): "King", "2 Queens", etc.
- `base_price` (DECIMAL(10,2)): Default nightly rate
- `max_capacity` (INT): Maximum guests
- `status` (ENUM): 'available' | 'out_of_service'
- `amenities` (JSONB): Array of amenity features
- `created_at`, `updated_at` (TIMESTAMP)

#### `bookings`
Guest reservations and stay records.
- `id` (UUID, PK): Booking identifier
- `room_id` (UUID, FK → rooms.id): Reserved room
- `reference_number` (VARCHAR(20), UNIQUE): Customer reference
- `guest_name` (VARCHAR(255)): Primary guest name
- `guest_contact` (VARCHAR(15)): Phone number
- `guest_email` (VARCHAR(255)): Email address
- `check_in_date`, `check_out_date` (DATE): Stay dates
- `total_cost` (DECIMAL(10,2)): Final booking amount
- `status` (ENUM): 'pending' | 'confirmed' | 'cancelled'
- `source` (VARCHAR(50)): Booking channel (website, phone, etc.)
- `created_at`, `updated_at` (TIMESTAMP)

#### `payment`
Payment records for bookings.
- `id` (UUID, PK): Payment identifier
- `booking_id` (UUID, FK → bookings.id): Associated booking
- `amount` (DECIMAL): Payment amount
- `payment_method` (ENUM): 'Card' | 'Cash'
- `identifier` (TEXT): Transaction ID or reference

### Supporting Tables

#### `rate_rules`
Dynamic pricing rules by date range and conditions.
- `id` (UUID, PK)
- `room_id` (UUID, FK → rooms.id): Target room
- `start_date`, `end_date` (DATE): Effective date range
- `price_per_night` (DECIMAL(10,2)): Override price
- `min_stay_nights` (INT): Minimum stay requirement
- `day_of_week` (INT[]): Applicable days (0=Sunday, 6=Saturday)
- `source` (VARCHAR(50)): Rule origin/channel

#### `blocked_dates`
Room availability restrictions.
- `id` (UUID, PK)
- `room_id` (UUID, FK → rooms.id): Blocked room
- `blocked_date` (DATE): Unavailable date
- `notes` (TEXT): Reason for blocking
- `created_at` (TIMESTAMP)
- UNIQUE constraint on (room_id, blocked_date)

#### `reviews`
Guest feedback and ratings.
- `id` (UUID, PK)
- `booking_id` (UUID, FK → bookings.id, UNIQUE): One review per booking
- `room_id` (UUID, FK → rooms.id): Reviewed room
- `rating` (INTEGER): 1-5 star rating
- `comment` (TEXT): Guest feedback
- `is_published` (BOOLEAN): Public visibility flag
- `created_at` (TIMESTAMP)

#### `room_photos`
Image galleries for rooms.
- `id` (UUID, PK)
- `room_id` (UUID, FK → rooms.id): Associated room
- `image_url` (VARCHAR(255)): Photo URL/path
- `sort_order` (INT): Display order

## Business Logic Patterns

### Booking Workflow
1. Check room availability (not in blocked_dates, no conflicting bookings)
2. Calculate pricing (base_price + applicable rate_rules)
3. Create booking with 'pending' status
4. Process payment
5. Confirm booking (status → 'confirmed')

### Pricing Calculation
```sql
-- Base price from rooms table
-- Override with rate_rules if date range matches
-- Consider day_of_week restrictions
-- Apply minimum stay requirements
```

### Availability Check
```sql
-- Room must have status = 'available'
-- No blocked_dates for requested period
-- No confirmed/pending bookings with overlapping dates
```

### Common Queries

#### Check Room Availability
```sql
SELECT r.* FROM rooms r
WHERE r.hotel_id = $hotel_id
  AND r.status = 'available'
  AND r.id NOT IN (
    -- No blocking dates
    SELECT DISTINCT room_id FROM blocked_dates
    WHERE blocked_date BETWEEN $check_in AND $check_out
  )
  AND r.id NOT IN (
    -- No conflicting bookings
    SELECT DISTINCT room_id FROM bookings
    WHERE status IN ('confirmed', 'pending')
      AND (check_in_date <= $check_out AND check_out_date >= $check_in)
  );
```

#### Calculate Room Price
```sql
WITH applicable_rules AS (
  SELECT price_per_night, min_stay_nights
  FROM rate_rules
  WHERE room_id = $room_id
    AND start_date <= $check_in
    AND end_date >= $check_out
    AND ($day_of_week = ANY(day_of_week) OR day_of_week IS NULL)
  ORDER BY start_date DESC
  LIMIT 1
)
SELECT COALESCE(ar.price_per_night, r.base_price) as nightly_rate,
       COALESCE(ar.min_stay_nights, 1) as min_nights
FROM rooms r
LEFT JOIN applicable_rules ar ON true
WHERE r.id = $room_id;
```

#### Hotel Revenue Report
```sql
SELECT 
  h.name,
  COUNT(b.id) as total_bookings,
  SUM(b.total_cost) as total_revenue,
  AVG(rev.rating) as avg_rating
FROM hotel h
JOIN rooms r ON r.hotel_id = h.id
JOIN bookings b ON b.room_id = r.id
LEFT JOIN reviews rev ON rev.booking_id = b.id AND rev.is_published = true
WHERE b.status = 'confirmed'
  AND b.check_in_date >= $start_date
  AND b.check_out_date <= $end_date
GROUP BY h.id, h.name;
```

## Data Types & Enums

### Enums
- `user_role`: 'admin', 'staff'
- `payment_method`: 'Card', 'Cash'
- `room_status`: 'available', 'out_of_service'
- `booking_status`: 'pending', 'confirmed', 'cancelled'
- `adjustment_type`: 'percentage', 'fixed' (for future use)

### JSON Fields
- `hotel.contact_info`: `{"phone": "...", "email": "...", "website": "..."}`
- `rooms.amenities`: `["WiFi", "TV", "AC", "Mini Bar", "Safe"]`

## Indexes & Performance

### Key Indexes
- `rooms.hotel_id` - Fast hotel room lookups
- `bookings.room_id` - Availability checks
- `bookings.reference_number` - Customer lookups
- `rate_rules(room_id, start_date, end_date)` - Pricing queries
- `blocked_dates(room_id, blocked_date)` - Availability checks

### Performance Considerations
- Use date range queries efficiently for availability
- Consider partitioning bookings by year for large datasets
- Cache room amenities and rate rules for frequently accessed rooms
- Index on booking status for operational queries

## Security & Validation

### Required Validations
- Email format validation for users and guests
- Phone number format for guest_contact
- Date validation (check_out > check_in)
- Rating bounds (1-5 for reviews)
- Non-negative prices and amounts
- UUID format for all ID fields

### Access Control
- Users can only access hotels they're assigned to via hotel_users_pivot
- Role-based permissions (admin vs staff capabilities)
- Booking reference numbers should be non-guessable
- Payment identifiers should be encrypted/hashed if storing card data

## Migration Notes
- PostgreSQL-specific features: UUID generation, JSONB, array types
- Automatic timestamp updates via triggers (or Prisma @updatedAt)
- Cascade deletes configured for data consistency
- Unique constraints prevent duplicate bookings and room conflicts