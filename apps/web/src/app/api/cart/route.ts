import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/authorization";
import { InputError, parseCartQuantity } from "@/lib/backend-policy.mjs";
import { CART_COOKIE_NAME, getOrCreateActiveCart, validCartToken } from "@/lib/storefront/cart-storage";

export const dynamic = "force-dynamic";
const CART_MAX_AGE = 30 * 24 * 60 * 60;

function cartPayload(cart: any) {
  const items = cart.items.map((line: any) => ({
    id: line.productId,
    name: line.product.name,
    price: Number(line.priceSnapshot.toString()),
    currentPrice: Number(line.product.price.toString()),
    priceChanged: !line.priceSnapshot.equals(line.product.price),
    stock: line.product.stock,
    image: line.product.image,
    qty: line.quantity,
    available: line.product.active,
  }));
  return { items, total: items.reduce((sum: number, line: any) => sum + line.price * line.qty, 0) };
}

function applyCartCookie(response: NextResponse, result: any) {
  if (result.clearGuestCookie) {
    response.cookies.set(CART_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  } else if (result.guestToken) {
    response.cookies.set(CART_COOKIE_NAME, result.guestToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CART_MAX_AGE,
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function errorResponse(error: unknown) {
  if (error instanceof InputError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  if (error instanceof Error && error.message.startsWith("CART_")) {
    const messages: Record<string, string> = {
      CART_EMPTY: "السلة فارغة",
      CART_UNAVAILABLE: "هذا المنتج لم يعد متاحاً",
      CART_STOCK: "الكمية المطلوبة غير متوفرة حالياً",
      CART_NOT_EMPTY: "تم تحديث السلة من جهاز آخر. أعد تحميل الصفحة.",
    };
    const status = error.message === "CART_EMPTY" ? 400 : 409;
    return NextResponse.json({ error: messages[error.message] ?? "تعذر تحديث السلة" }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "تعذر تحديث السلة" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const cookie = request.cookies.get(CART_COOKIE_NAME)?.value;
    const result = await db.$transaction((tx) =>
      getOrCreateActiveCart(tx, user?.id ?? null, validCartToken(cookie) ? cookie : null),
    );
    return applyCartCookie(NextResponse.json(cartPayload(result.cart)), result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try { body = await request.json(); }
    catch { throw new InputError("بيانات السلة غير صالحة"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Invalid cart request");
    const user = await getCurrentUser();
    const cookie = request.cookies.get(CART_COOKIE_NAME)?.value;
    const result = await db.$transaction(async (tx) => {
      const resolved = await getOrCreateActiveCart(tx, user?.id ?? null, validCartToken(cookie) ? cookie : null);
      const cart = resolved.cart;
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cart.id} FOR UPDATE`;

      if (body.action === "add") {
        const productId = typeof body.productId === "string" ? body.productId : "";
        const quantity = parseCartQuantity(body.quantity ?? 1);
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product?.active) throw new Error("CART_UNAVAILABLE");
        const existing = await tx.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        const nextQuantity = (existing?.quantity ?? 0) + quantity;
        if (nextQuantity > 99 || nextQuantity > product.stock) throw new Error("CART_STOCK");
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId } },
          create: { cartId: cart.id, productId, quantity, priceSnapshot: product.price },
          update: { quantity: nextQuantity, priceSnapshot: product.price },
        });
      } else if (body.action === "set") {
        const productId = typeof body.productId === "string" ? body.productId : "";
        const quantity = parseCartQuantity(body.quantity, { allowZero: true });
        if (quantity === 0) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
        } else {
          const product = await tx.product.findUnique({ where: { id: productId } });
          if (!product?.active) throw new Error("CART_UNAVAILABLE");
          if (quantity > product.stock) throw new Error("CART_STOCK");
          await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId } },
            create: { cartId: cart.id, productId, quantity, priceSnapshot: product.price },
            update: { quantity, priceSnapshot: product.price },
          });
        }
      } else if (body.action === "refresh") {
        const productId = typeof body.productId === "string" ? body.productId : "";
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product?.active) throw new Error("CART_UNAVAILABLE");
        const existing = await tx.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        if (!existing) throw new InputError("المنتج غير موجود في السلة");
        if (existing.quantity > product.stock) throw new Error("CART_STOCK");
        await tx.cartItem.update({ where: { id: existing.id }, data: { priceSnapshot: product.price } });
      } else if (body.action === "remove") {
        const productId = typeof body.productId === "string" ? body.productId : "";
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
      } else if (body.action === "clear") {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      } else if (body.action === "sync") {
        if (cart.items.length) throw new Error("CART_NOT_EMPTY");
        if (!Array.isArray(body.items) || body.items.length > 100) throw new InputError("Invalid cart items");
        const requested = new Map<string, number>();
        for (const item of body.items) {
          if (!item || typeof item.productId !== "string") throw new InputError("Invalid cart item");
          const quantity = parseCartQuantity(item.quantity);
          requested.set(item.productId, Math.min(99, quantity + (requested.get(item.productId) ?? 0)));
        }
        const products = await tx.product.findMany({ where: { id: { in: [...requested.keys()] }, active: true } });
        for (const product of products) {
          const quantity = Math.min(requested.get(product.id) ?? 0, product.stock);
          if (quantity > 0) await tx.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity, priceSnapshot: product.price } });
        }
      } else {
        throw new InputError("Unsupported cart action");
      }

      return {
        ...resolved,
        cart: await tx.cart.findUniqueOrThrow({
          where: { id: cart.id },
          include: { items: { include: { product: true } } },
        }),
      };
    });
    return applyCartCookie(NextResponse.json(cartPayload(result.cart)), result);
  } catch (error) {
    return errorResponse(error);
  }
}
