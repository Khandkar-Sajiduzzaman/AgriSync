/*
  Warnings:

  - The values [express] on the enum `DeliveryType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deliveredAt` on the `Order` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "DeliveryRequestStatus" ADD VALUE 'expired';

-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryType_new" AS ENUM ('normal', 'instant', 'same_day', 'scheduled');
ALTER TABLE "Order" ALTER COLUMN "deliveryType" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "deliveryType" TYPE "DeliveryType_new" USING ("deliveryType"::text::"DeliveryType_new");
ALTER TABLE "DeliveryRequest" ALTER COLUMN "requestType" TYPE "DeliveryType_new" USING ("requestType"::text::"DeliveryType_new");
ALTER TYPE "DeliveryType" RENAME TO "DeliveryType_old";
ALTER TYPE "DeliveryType_new" RENAME TO "DeliveryType";
DROP TYPE "DeliveryType_old";
ALTER TABLE "Order" ALTER COLUMN "deliveryType" SET DEFAULT 'normal';
COMMIT;

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'awaiting_delivery';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveredAt";
