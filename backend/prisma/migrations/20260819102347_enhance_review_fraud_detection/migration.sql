/*
  Warnings:

  - A unique constraint covering the columns `[authorId,productId,orderId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "fraudReasons" TEXT[],
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "CartItem_userId_createdAt_idx" ON "CartItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_legacyCategory_idx" ON "Product"("legacyCategory");

-- CreateIndex
CREATE INDEX "Review_isFlagged_idx" ON "Review"("isFlagged");

-- CreateIndex
CREATE INDEX "Review_moderationStatus_idx" ON "Review"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_productId_orderId_key" ON "Review"("authorId", "productId", "orderId");
