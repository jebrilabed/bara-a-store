ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "deliveryZone" TEXT,
    ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    ALTER TABLE "Order"
        ADD CONSTRAINT "Order_deliveryFee_nonnegative" CHECK ("deliveryFee" >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;