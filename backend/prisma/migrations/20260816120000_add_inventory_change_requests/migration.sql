DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryRequestStatus') THEN
    CREATE TYPE "InventoryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InventoryChangeRequest" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "requestedStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "InventoryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryChangeRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryChangeRequest_farmerId_fkey'
  ) THEN
    ALTER TABLE "InventoryChangeRequest"
      ADD CONSTRAINT "InventoryChangeRequest_farmerId_fkey"
      FOREIGN KEY ("farmerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryChangeRequest_productId_fkey'
  ) THEN
    ALTER TABLE "InventoryChangeRequest"
      ADD CONSTRAINT "InventoryChangeRequest_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryChangeRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "InventoryChangeRequest"
      ADD CONSTRAINT "InventoryChangeRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InventoryChangeRequest_farmerId_idx"
    ON "InventoryChangeRequest"("farmerId");

CREATE INDEX IF NOT EXISTS "InventoryChangeRequest_productId_idx"
    ON "InventoryChangeRequest"("productId");

CREATE INDEX IF NOT EXISTS "InventoryChangeRequest_status_idx"
    ON "InventoryChangeRequest"("status");
