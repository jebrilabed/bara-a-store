import { randomBytes, createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma";

export const CART_COOKIE_NAME = "baraa_cart";
export const CART_RESERVATION_MINUTES = 15;
export const CART_RESERVATION_MS = CART_RESERVATION_MINUTES * 60 * 1000;
const CART_LIFETIME_DAYS = 30;
const cartItemsInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, price: true, stock: true, image: true, active: true } },
    },
  },
} as const;

type LockedCartRow = {
  cartId: string;
  itemId: string | null;
  itemProductId: string | null;
  quantity: number | null;
  priceSnapshot: Prisma.Decimal | null;
  itemExpiresAt: Date | null;
  productId: string | null;
  productName: string | null;
  productPrice: Prisma.Decimal | null;
  productStock: number | null;
  productImage: string | null;
  productActive: boolean | null;
  targetProductId: string | null;
  targetProductName: string | null;
  targetProductPrice: Prisma.Decimal | null;
  targetProductStock: number | null;
  targetProductImage: string | null;
  targetProductActive: boolean | null;
};

export async function releaseExpiredReservations(_tx: Prisma.TransactionClient, _now = new Date()) {
  return 0;
}

function lockedCartResult(rows: LockedCartRow[], guestToken: string | null, clearGuestCookie: boolean) {
  const items = rows.flatMap((row) => row.itemId && row.itemProductId && row.productId && row.quantity !== null && row.priceSnapshot
    ? [{
        id: row.itemId,
        productId: row.itemProductId,
        quantity: row.quantity,
        priceSnapshot: row.priceSnapshot,
        expiresAt: row.itemExpiresAt,
        product: {
          id: row.productId,
          name: row.productName ?? "",
          price: row.productPrice ?? row.priceSnapshot,
          stock: row.productStock ?? 0,
          image: row.productImage,
          active: row.productActive ?? false,
        },
      }]
    : []);
  return {
    cart: { id: rows[0].cartId, items },
    targetProduct: rows[0].targetProductId
      ? {
          id: rows[0].targetProductId,
          name: rows[0].targetProductName ?? "",
          price: rows[0].targetProductPrice!,
          stock: rows[0].targetProductStock ?? 0,
          image: rows[0].targetProductImage,
          active: rows[0].targetProductActive ?? false,
        }
      : null,
    guestToken,
    clearGuestCookie,
    locked: true,
  };
}

export function newCartToken() {
  return randomBytes(32).toString("base64url");
}

export function validCartToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(value);
}

export function hashCartToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function expiryDate() {
  return new Date(Date.now() + CART_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}

export async function getOrCreateActiveCart(
  tx: Prisma.TransactionClient,
  userId: string | null,
  suppliedGuestToken: string | null,
  includeItems = true,
  lockExisting = false,
  requestedProductId: string | null = null,
) {
  const now = new Date();
  const guestToken = validCartToken(suppliedGuestToken) ? suppliedGuestToken : null;
  if (lockExisting && !includeItems && userId && !guestToken) {
    const rows = await tx.$queryRaw<LockedCartRow[]>`
      WITH locked_cart AS MATERIALIZED (
        SELECT "id" FROM "Cart"
        WHERE "userId" = ${userId}
          AND "status" = 'ACTIVE'
          AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE
      )
      SELECT
        locked_cart."id" AS "cartId",
        item."id" AS "itemId",
        item."productId" AS "itemProductId",
        item."quantity" AS "quantity",
        item."priceSnapshot" AS "priceSnapshot",
        item."expiresAt" AS "itemExpiresAt",
        product."id" AS "productId",
        product."name" AS "productName",
        product."price" AS "productPrice",
        product."stock" AS "productStock",
        product."image" AS "productImage",
        product."active" AS "productActive",
        target_product."id" AS "targetProductId",
        target_product."name" AS "targetProductName",
        target_product."price" AS "targetProductPrice",
        target_product."stock" AS "targetProductStock",
        target_product."image" AS "targetProductImage",
        target_product."active" AS "targetProductActive"
      FROM locked_cart
      LEFT JOIN "CartItem" item ON item."cartId" = locked_cart."id"
      LEFT JOIN "Product" product ON product."id" = item."productId"
      LEFT JOIN "Product" target_product ON target_product."id" = ${requestedProductId}
    `;
    if (rows.length) return lockedCartResult(rows, null, true);
  } else if (lockExisting && !includeItems && !userId && guestToken) {
    const tokenHash = hashCartToken(guestToken);
    const rows = await tx.$queryRaw<LockedCartRow[]>`
      WITH locked_cart AS MATERIALIZED (
        SELECT "id" FROM "Cart"
        WHERE "guestTokenHash" = ${tokenHash}
          AND "status" = 'ACTIVE'
          AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
        LIMIT 1
        FOR UPDATE
      )
      SELECT
        locked_cart."id" AS "cartId",
        item."id" AS "itemId",
        item."productId" AS "itemProductId",
        item."quantity" AS "quantity",
        item."priceSnapshot" AS "priceSnapshot",
        item."expiresAt" AS "itemExpiresAt",
        product."id" AS "productId",
        product."name" AS "productName",
        product."price" AS "productPrice",
        product."stock" AS "productStock",
        product."image" AS "productImage",
        product."active" AS "productActive",
        target_product."id" AS "targetProductId",
        target_product."name" AS "targetProductName",
        target_product."price" AS "targetProductPrice",
        target_product."stock" AS "targetProductStock",
        target_product."image" AS "targetProductImage",
        target_product."active" AS "targetProductActive"
      FROM locked_cart
      LEFT JOIN "CartItem" item ON item."cartId" = locked_cart."id"
      LEFT JOIN "Product" product ON product."id" = item."productId"
      LEFT JOIN "Product" target_product ON target_product."id" = ${requestedProductId}
    `;
    if (rows.length) return lockedCartResult(rows, guestToken, false);
  }

  let resolvedGuestToken = guestToken;
  let guestCart = resolvedGuestToken
    ? await tx.cart.findUnique({
        where: { guestTokenHash: hashCartToken(resolvedGuestToken) },
        include: includeItems ? cartItemsInclude : undefined,
      })
    : null;

  if (guestCart && guestCart.status === "ACTIVE" && guestCart.expiresAt && guestCart.expiresAt <= now) {
    await tx.cart.update({ where: { id: guestCart.id }, data: { status: "ABANDONED" } });
    guestCart = null;
    resolvedGuestToken = null;
  } else if (guestCart && guestCart.status !== "ACTIVE") {
    guestCart = null;
    resolvedGuestToken = null;
  }

  if (userId) {
    let userCart = await tx.cart.findFirst({
      where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: includeItems ? cartItemsInclude : undefined,
      orderBy: { createdAt: "asc" },
    });
    if (!userCart) {
      await tx.cart.updateMany({
        where: { userId, status: "ACTIVE", expiresAt: { lte: now } },
        data: { status: "ABANDONED" },
      });
    } else {
      await tx.cart.updateMany({
        where: { userId, status: "ACTIVE", id: { not: userCart.id } },
        data: { status: "ABANDONED" },
      });
    }

    if (guestCart && guestCart.userId !== userId) {
      if (!userCart) {
        userCart = await tx.cart.update({
          where: { id: guestCart.id },
          data: { userId, guestTokenHash: null, expiresAt: expiryDate() },
          include: includeItems ? cartItemsInclude : undefined,
        });
      } else {
        const guestItems = await tx.cartItem.findMany({
          where: { cartId: guestCart.id },
          include: { product: true },
        });
        if (guestItems.length > 0) {
          const userItems = await tx.cartItem.findMany({
            where: { cartId: userCart.id },
          });
          const userItemMap = new Map(userItems.map((i) => [i.productId, i]));
          for (const line of guestItems) {
            if (!line.product.active || line.product.stock < 1) continue;
            const existing = userItemMap.get(line.productId);
            const quantity = Math.min(line.product.stock, 99, line.quantity + (existing?.quantity ?? 0));
            if (quantity < 1) continue;
            await tx.cartItem.upsert({
              where: { cartId_productId: { cartId: userCart.id, productId: line.productId } },
              create: { cartId: userCart.id, productId: line.productId, quantity, priceSnapshot: line.product.price },
              update: { quantity, priceSnapshot: line.product.price },
            });
          }
        }
        await tx.cart.update({ where: { id: guestCart.id }, data: { status: "ABANDONED" } });
        if (includeItems) {
          userCart = await tx.cart.findUniqueOrThrow({
            where: { id: userCart.id },
            include: cartItemsInclude,
          });
        }
      }
    }

    if (!userCart) {
      userCart = await tx.cart.create({
        data: { userId, expiresAt: expiryDate() },
        include: includeItems ? cartItemsInclude : undefined,
      });
    }
    return { cart: userCart, targetProduct: null, guestToken: null, clearGuestCookie: true, locked: false };
  }

  if (!resolvedGuestToken) resolvedGuestToken = newCartToken();
  const tokenHash = hashCartToken(resolvedGuestToken);
  let cart = guestCart;

  if (!cart) {
    cart = await tx.cart.create({
      data: { guestTokenHash: tokenHash, expiresAt: expiryDate() },
      include: includeItems ? cartItemsInclude : undefined,
    });
  }

  return { cart, targetProduct: null, guestToken: resolvedGuestToken, clearGuestCookie: false, locked: false };
}
