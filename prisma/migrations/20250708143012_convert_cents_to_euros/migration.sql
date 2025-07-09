-- Convert all monetary fields from cents (Int) to euros (DECIMAL)

-- 1. Update Room table
ALTER TABLE "rooms" 
  ALTER COLUMN "base_price" TYPE DECIMAL(10,2) USING "base_price"::DECIMAL / 100,
  ALTER COLUMN "airbnb_price" TYPE DECIMAL(10,2) USING "airbnb_price"::DECIMAL / 100,
  ALTER COLUMN "booking_com_price" TYPE DECIMAL(10,2) USING "booking_com_price"::DECIMAL / 100,
  ALTER COLUMN "pet_fee" TYPE DECIMAL(10,2) USING "pet_fee"::DECIMAL / 100,
  ALTER COLUMN "cleaning_fee" TYPE DECIMAL(10,2) USING "cleaning_fee"::DECIMAL / 100;

-- 2. Update Booking table
ALTER TABLE "bookings"
  ALTER COLUMN "total_cost" TYPE DECIMAL(10,2) USING "total_cost"::DECIMAL / 100;

-- 3. Update Payment table
ALTER TABLE "payments"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL / 100;

-- 4. Update RateRule table
ALTER TABLE "rate_rules"
  ALTER COLUMN "price_per_night" TYPE DECIMAL(10,2) USING "price_per_night"::DECIMAL / 100;