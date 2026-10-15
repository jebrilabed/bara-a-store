ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "receiptPublicId" TEXT,
    ADD COLUMN IF NOT EXISTS "receiptResourceType" TEXT,
    ADD COLUMN IF NOT EXISTS "receiptFormat" TEXT;