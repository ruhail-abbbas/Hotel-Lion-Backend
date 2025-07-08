/*
  Warnings:

  - You are about to drop the column `description` on the `airbnb_listings` table. All the data in the column will be lost.
  - You are about to drop the column `listing_id` on the `airbnb_listings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "airbnb_listings" DROP COLUMN "description",
DROP COLUMN "listing_id";
