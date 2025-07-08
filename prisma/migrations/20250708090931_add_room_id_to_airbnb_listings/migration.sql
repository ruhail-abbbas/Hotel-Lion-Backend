/*
  Warnings:

  - Added the required column `room_id` to the `airbnb_listings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "airbnb_listings" ADD COLUMN     "room_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "airbnb_listings_room_id_idx" ON "airbnb_listings"("room_id");

-- AddForeignKey
ALTER TABLE "airbnb_listings" ADD CONSTRAINT "airbnb_listings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
