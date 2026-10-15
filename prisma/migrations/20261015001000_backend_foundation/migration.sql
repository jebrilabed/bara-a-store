-- Additive backend foundation. Existing price values are rounded to the
-- storefront's displayed two decimal places while moving to exact decimal money.
CREATE TYPE "ProductType" AS ENUM ('SKINCARE', 'PERSONAL_CARE', 'HOME_CLEANING', 'HOME_FRAGRANCE', 'AIR_FRESHENER');
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

ALTER TABLE "Product"
    ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'PERSONAL_CARE',
    ADD COLUMN "skuCode" TEXT,
    ADD COLUMN "packageSize" TEXT,
    ADD COLUMN "ingredients" TEXT,
    ADD COLUMN "skinSuitability" TEXT,
    ADD COLUMN "scentProfile" TEXT,
    ADD COLUMN "usageInstructions" TEXT,
    ADD COLUMN "usageArea" TEXT,
    ADD COLUMN "safetyWarnings" TEXT,
    ADD COLUMN "storageInstructions" TEXT,
    ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING ROUND("price"::numeric, 2);

-- Preserve and classify existing sample/catalog rows where their category slug is known.
UPDATE "Product" AS product SET "type" = 'SKINCARE'
FROM "Category" AS category
WHERE product."categoryId" = category."id" AND LOWER(category."slug") IN ('skin', 'skincare', 'skin-care');
UPDATE "Product" AS product SET "type" = 'HOME_FRAGRANCE'
FROM "Category" AS category
WHERE product."categoryId" = category."id" AND LOWER(category."slug") IN ('scent', 'fragrance', 'home-fragrance', 'home-scent');
UPDATE "Product" AS product SET "type" = 'HOME_CLEANING'
FROM "Category" AS category
WHERE product."categoryId" = category."id" AND LOWER(category."slug") IN ('clean', 'cleaning', 'home-cleaning', 'household-cleaners');
UPDATE "Product" AS product SET "type" = 'AIR_FRESHENER'
FROM "Category" AS category
WHERE product."categoryId" = category."id" AND LOWER(category."slug") IN ('air-freshener', 'air-fresheners', 'air-freshener-spray');
UPDATE "Product"
SET "skuCode" = 'BS-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 24))
WHERE "skuCode" IS NULL;

CREATE UNIQUE INDEX "Product_skuCode_key" ON "Product"("skuCode");
CREATE INDEX "Product_active_type_idx" ON "Product"("active", "type");
CREATE INDEX "Product_categoryId_active_idx" ON "Product"("categoryId", "active");
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0);

ALTER TABLE "Order"
    ADD COLUMN "guestTokenHash" TEXT,
    ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Order" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING ROUND("total"::numeric, 2);
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonnegative" CHECK ("total" >= 0);

ALTER TABLE "OrderItem"
    ADD COLUMN "productNameSnapshot" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "productImageSnapshot" TEXT,
    ADD COLUMN "skuCodeSnapshot" TEXT;
UPDATE "OrderItem" AS oi
SET "productNameSnapshot" = p."name", "productImageSnapshot" = p."image"
FROM "Product" AS p
WHERE p."id" = oi."productId";
ALTER TABLE "OrderItem" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING ROUND("price"::numeric, 2);
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_price_nonnegative" CHECK ("price" >= 0);

CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestTokenHash" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceSnapshot" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "CartItem_priceSnapshot_nonnegative" CHECK ("priceSnapshot" >= 0)
);
CREATE UNIQUE INDEX "Cart_guestTokenHash_key" ON "Cart"("guestTokenHash");
CREATE UNIQUE INDEX "Cart_one_active_user_idx" ON "Cart"("userId") WHERE "userId" IS NOT NULL AND "status" = 'ACTIVE';
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");
CREATE INDEX "Cart_status_updatedAt_idx" ON "Cart"("status", "updatedAt");
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityId_createdAt_idx" ON "AdminAuditLog"("entityType", "entityId", "createdAt");
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
