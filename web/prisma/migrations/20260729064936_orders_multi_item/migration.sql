-- Order/Booking redesign: a payment transaction (Order) can now hold N line
-- items (Booking), instead of 1:1 booking<->payment session.
--
-- Hand-edited from `prisma migrate diff` output (see web/AGENTS.md for why):
-- the generator emits DROP+CREATE for the renamed enums and has no idea the
-- existing Booking rows are sandbox/test data only (no production launch
-- yet, confirmed 2026-07-29) — it would otherwise try to ADD COLUMN "orderId"
-- TEXT NOT NULL with no default against rows that can't satisfy it.

-- 1. Rename enums (not drop+recreate: BookingProvider/BookingStatus values
--    are unchanged, only the type name changes to match the new model).
ALTER TYPE "BookingStatus" RENAME TO "OrderStatus";
ALTER TYPE "BookingProvider" RENAME TO "OrderProvider";

-- 2. Wipe existing Booking rows. Safe: only test/sandbox purchases exist
--    (this is the local dev database), no real business history to keep.
DELETE FROM "Booking";

-- 3. New Order table: owns payment state, previously on Booking.
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "provider" "OrderProvider" NOT NULL DEFAULT 'stripe',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Order_paypalOrderId_key" ON "Order"("paypalOrderId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Booking becomes a line item: drop its old payment-state columns
--    (now empty, table was wiped above), add the orderId FK + position.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_customerId_fkey";

ALTER TABLE "Booking"
    DROP COLUMN "currency",
    DROP COLUMN "customerId",
    DROP COLUMN "paypalCaptureId",
    DROP COLUMN "paypalOrderId",
    DROP COLUMN "provider",
    DROP COLUMN "status",
    DROP COLUMN "stripePaymentIntentId",
    DROP COLUMN "stripeSessionId",
    DROP COLUMN "updatedAt",
    ADD COLUMN "orderId" TEXT NOT NULL,
    ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
