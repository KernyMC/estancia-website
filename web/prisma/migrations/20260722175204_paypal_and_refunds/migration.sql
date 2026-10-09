-- CreateEnum
CREATE TYPE "BookingProvider" AS ENUM ('stripe', 'paypal');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paypalCaptureId" TEXT,
ADD COLUMN     "paypalOrderId" TEXT,
ADD COLUMN     "provider" "BookingProvider" NOT NULL DEFAULT 'stripe',
ALTER COLUMN "stripeSessionId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paypalOrderId_key" ON "Booking"("paypalOrderId");
