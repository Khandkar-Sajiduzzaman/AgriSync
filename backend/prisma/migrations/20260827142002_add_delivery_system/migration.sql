-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('normal', 'express', 'same_day', 'scheduled');

-- CreateEnum
CREATE TYPE "DeliveryRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- AlterTable
ALTER TABLE "DeliveryManProfile" ADD COLUMN     "maxOrders" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "preferredAreas" TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryArea" TEXT,
ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'normal';

-- CreateTable
CREATE TABLE "DeliveryRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryManId" TEXT NOT NULL,
    "status" "DeliveryRequestStatus" NOT NULL DEFAULT 'pending',
    "requestType" "DeliveryType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryRequest_deliveryManId_status_idx" ON "DeliveryRequest"("deliveryManId", "status");

-- CreateIndex
CREATE INDEX "DeliveryRequest_orderId_idx" ON "DeliveryRequest"("orderId");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_deliveryManId_fkey" FOREIGN KEY ("deliveryManId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
