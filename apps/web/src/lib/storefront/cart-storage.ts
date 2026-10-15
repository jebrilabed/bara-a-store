import { randomBytes, createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma";

export const CART_COOKIE_NAME = "baraa_cart";
const CART_LIFETIME_DAYS = 30;

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
) {
  const now = new Date();
  if (userId) {
    await tx.cart.updateMany({
      where: { userId, status: "ACTIVE", expiresAt: { lte: now } },
      data: { status: "ABANDONED" },
    });
  }
  let guestToken = validCartToken(suppliedGuestToken) ? suppliedGuestToken : null;
  let guestCart = guestToken
    ? await tx.cart.findUnique({ where: { guestTokenHash: hashCartToken(guestToken) }, include: { items: true } })
    : null;

  if (guestCart && guestCart.status === "ACTIVE" && guestCart.expiresAt && guestCart.expiresAt <= now) {
    await tx.cart.update({ where: { id: guestCart.id }, data: { status: "ABANDONED" } });
    guestCart = null;
    guestToken = null;
  } else if (guestCart && guestCart.status !== "ACTIVE") {
    guestCart = null;
    guestToken = null;
  }

  if (userId) {
    let userCart = await tx.cart.findFirst({
      where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (guestCart && guestCart.userId !== userId) {
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${guestCart.id} FOR UPDATE`;
      if (!userCart) {
        userCart = await tx.cart.update({
          where: { id: guestCart.id },
          data: { userId, guestTokenHash: null, expiresAt: expiryDate() },
          include: { items: { include: { product: true } } },
        });
      } else {
        await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${userCart.id} FOR UPDATE`;
        const guestItems = await tx.cartItem.findMany({
          where: { cartId: guestCart.id },
          include: { product: true },
        });
        for (const line of guestItems) {
          if (!line.product.active || line.product.stock < 1) continue;
          const existing = await tx.cartItem.findUnique({
            where: { cartId_productId: { cartId: userCart.id, productId: line.productId } },
          });
          const quantity = Math.min(line.product.stock, 99, line.quantity + (existing?.quantity ?? 0));
          if (quantity < 1) continue;
          await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: userCart.id, productId: line.productId } },
            create: { cartId: userCart.id, productId: line.productId, quantity, priceSnapshot: line.product.price },
            update: { quantity, priceSnapshot: line.product.price },
          });
        }
        await tx.cart.update({ where: { id: guestCart.id }, data: { status: "ABANDONED" } });
        userCart = await tx.cart.findUniqueOrThrow({
          where: { id: userCart.id },
          include: { items: { include: { product: true } } },
        });
      }
    }

    if (!userCart) {
      userCart = await tx.cart.create({
        data: { userId, expiresAt: expiryDate() },
        include: { items: { include: { product: true } } },
      });
    }
    return { cart: userCart, guestToken: null, clearGuestCookie: true };
  }

  if (!guestToken) guestToken = newCartToken();
  const tokenHash = hashCartToken(guestToken);
  let cart = guestCart ?? await tx.cart.findUnique({
    where: { guestTokenHash: tokenHash },
    include: { items: { include: { product: true } } },
  });

  if (!cart) {
    cart = await tx.cart.create({
      data: { guestTokenHash: tokenHash, expiresAt: expiryDate() },
      include: { items: { include: { product: true } } },
    });
  }

  return { cart, guestToken, clearGuestCookie: false };
}
