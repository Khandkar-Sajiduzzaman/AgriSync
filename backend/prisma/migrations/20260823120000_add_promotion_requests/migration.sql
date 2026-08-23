CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Promotion"
  ADD COLUMN "farmerId" TEXT,
  ADD COLUMN "productId" TEXT,
  ADD COLUMN "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

CREATE INDEX "Promotion_farmerId_idx" ON "Promotion"("farmerId");
CREATE INDEX "Promotion_productId_idx" ON "Promotion"("productId");
CREATE INDEX "Promotion_status_idx" ON "Promotion"("status");

ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;