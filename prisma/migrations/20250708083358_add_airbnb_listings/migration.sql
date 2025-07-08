-- CreateTable
CREATE TABLE "airbnb_listings" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "listing_url" TEXT NOT NULL,
    "listing_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airbnb_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airbnb_listings_listing_url_key" ON "airbnb_listings"("listing_url");

-- CreateIndex
CREATE INDEX "airbnb_listings_hotel_id_idx" ON "airbnb_listings"("hotel_id");

-- CreateIndex
CREATE INDEX "airbnb_listings_listing_url_idx" ON "airbnb_listings"("listing_url");

-- AddForeignKey
ALTER TABLE "airbnb_listings" ADD CONSTRAINT "airbnb_listings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
