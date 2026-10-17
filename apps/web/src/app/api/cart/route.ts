import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/authorization";
import { InputError, parseCartQuantity } from "@/lib/backend-policy.mjs";
import {
  CART_COOKIE_NAME,
  getOrCreateActiveCart,
  validCartToken,
} from "@/lib/storefront/cart-storage";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";
const CART_MAX_AGE = 30 * 24 * 60 * 60;
const CART_PERF_TRACE = process.env.CART_PERF_TRACE === "1";

function logCartTiming(action: string, startedAt: number, stages: Record<string, number>, correlationId: string | null = null) {
  if (!CART_PERF_TRACE) return;
  console.info("[cart-perf]", JSON.stringify({
    ...(correlationId ? { correlationId } : {}),
    action,
    totalMs: Math.round(performance.now() - startedAt),
    stages: Object.fromEntries(Object.entries(stages).map(([name, duration]) => [name, Math.round(duration)])),
  }));
}

function getCartPerfId(request: NextRequest) {
  const value = request.headers.get("x-cart-perf-id");
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

function cartPayload(cart: any) {
  const rawItems = Array.isArray(cart?.items) ? cart.items : [];
  const items = rawItems
    .filter((line: any) => line && line.productId && line.product && line.product.active && line.product.stock > 0)
    .map((line: any) => {
      const priceSnapshotNum = Number(line.priceSnapshot?.toString?.() ?? line.priceSnapshot ?? 0);
      const currentPriceNum = Number(line.product?.price?.toString?.() ?? line.product?.price ?? priceSnapshotNum);
      const hasEquals = typeof line.priceSnapshot?.equals === "function";
      const priceChanged = hasEquals && line.product?.price
        ? !line.priceSnapshot.equals(line.product.price)
        : priceSnapshotNum !== currentPriceNum;

      return {
        id: line.productId,
        name: String(line.product.name ?? ""),
        price: priceSnapshotNum,
        currentPrice: currentPriceNum,
        priceChanged,
        stock: Number(line.product.stock ?? 0),
        image: line.product.image ?? null,
        qty: Number(line.quantity ?? 1),
        available: Boolean(line.product.active),
      };
    });

  return {
    items,
    total: items.reduce((sum: number, line: any) => sum + line.price * line.qty, 0),
  };
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
  console.error("[cart-api-error]", error);
  if (error instanceof InputError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  if (error instanceof Error && error.message.startsWith("CART_")) {
    const messages: Record<string, string> = {
      CART_EMPTY: "السلة فارغة",
      CART_UNAVAILABLE: "هذا المنتج لم يعد متاحاً أو نفد من المخزون",
      CART_STOCK: "الكمية المطلوبة غير متوفرة حالياً",
      CART_NOT_EMPTY: "تم تحديث السلة من جهاز آخر. أعد تحميل الصفحة.",
    };
    const status = error.message === "CART_EMPTY" ? 400 : 409;
    return NextResponse.json({ error: messages[error.message] ?? "تعذر تحديث السلة" }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "تعذر تحديث السلة" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  const stages: Record<string, number> = {};
  try {
    let stageStartedAt = performance.now();
    const user = await getCurrentUser();
    stages.authMs = performance.now() - stageStartedAt;
    const cookie = request.cookies.get(CART_COOKIE_NAME)?.value;
    stageStartedAt = performance.now();
    const result = await db.$transaction(
      async (tx) => {
        const resolved = await getOrCreateActiveCart(tx, user?.id ?? null, validCartToken(cookie) ? cookie : null);
        const cart = resolved.cart;

        // Auto-remove any items whose stock ran out or became inactive
        if (cart?.items?.length) {
          const outOfStockIds: string[] = [];
          for (const item of cart.items) {
            if (!item.product || !item.product.active || item.product.stock <= 0) {
              outOfStockIds.push(item.id);
            } else if (item.quantity > item.product.stock) {
              item.quantity = item.product.stock;
              await tx.cartItem.update({
                where: { id: item.id },
                data: { quantity: item.product.stock },
              });
            }
          }
          if (outOfStockIds.length > 0) {
            await tx.cartItem.deleteMany({ where: { id: { in: outOfStockIds } } });
            cart.items = cart.items.filter((item: any) => !outOfStockIds.includes(item.id));
          }
        }
        return resolved;
      },
      { timeout: 15000, maxWait: 10000 },
    );
    stages.transactionMs = performance.now() - stageStartedAt;
    stageStartedAt = performance.now();
    const response = applyCartCookie(NextResponse.json(cartPayload(result.cart)), result);
    stages.responseMs = performance.now() - stageStartedAt;
    logCartTiming("get", startedAt, stages);
    return response;
  } catch (error) {
    logCartTiming("get-error", startedAt, stages);
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  const stages: Record<string, number> = {};
  const correlationId = getCartPerfId(request);
  let action = "invalid";
  try {
    let body: any;
    let stageStartedAt = performance.now();
    try { body = await request.json(); }
    catch { throw new InputError("بيانات السلة غير صالحة"); }
    stages.parseMs = performance.now() - stageStartedAt;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Invalid cart request");
    action = ["add", "set", "refresh", "remove", "clear", "sync"].includes(body.action) ? body.action : "invalid";
    stageStartedAt = performance.now();
    const user = await getCurrentUser();
    stages.authMs = performance.now() - stageStartedAt;
    const cookie = request.cookies.get(CART_COOKIE_NAME)?.value;
    const requestedProductId = ["add", "set", "refresh"].includes(body.action) && typeof body.productId === "string"
      ? body.productId
      : null;
    stageStartedAt = performance.now();
    const result = await db.$transaction(
      async (tx) => {
        const callbackStartedAt = performance.now();
        let queryStartedAt = performance.now();
        const resolved = await getOrCreateActiveCart(tx, user?.id ?? null, validCartToken(cookie) ? cookie : null, false, true, requestedProductId);
        stages.cartResolutionMs = performance.now() - queryStartedAt;
        const cart = resolved.cart;
        if (!resolved.locked) {
          queryStartedAt = performance.now();
          await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cart.id} FOR UPDATE`;
          stages.lockMs = performance.now() - queryStartedAt;
        }
        queryStartedAt = performance.now();
        const rawCartItems = resolved.locked ? cart.items : body.action === "clear" ? [] : await tx.cartItem.findMany({
          where: { cartId: cart.id },
          include: {
            product: { select: { id: true, name: true, price: true, stock: true, image: true, active: true } },
          },
        });
        stages.cartReadMs = performance.now() - queryStartedAt;

        // Auto-remove any items whose stock was purchased by someone else and ran out
        const outOfStockIds: string[] = [];
        const liveItems: typeof rawCartItems = [];
        for (const item of rawCartItems) {
          if (!item.product || !item.product.active || item.product.stock <= 0) {
            outOfStockIds.push(item.id);
          } else {
            if (item.quantity > item.product.stock) {
              item.quantity = item.product.stock;
              await tx.cartItem.update({ where: { id: item.id }, data: { quantity: item.product.stock } });
            }
            liveItems.push(item);
          }
        }
        if (outOfStockIds.length > 0) {
          await tx.cartItem.deleteMany({ where: { id: { in: outOfStockIds } } });
        }

        let responseItems = liveItems;
        const mutationStartedAt = performance.now();

        if (body.action === "add") {
          const productId = typeof body.productId === "string" ? body.productId : "";
          const quantity = parseCartQuantity(body.quantity ?? 1);
          const existing = liveItems.find((item) => item.productId === productId);
          const product = existing?.product ?? resolved.targetProduct ?? await tx.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, price: true, stock: true, image: true, active: true },
          });
          if (!product?.active || product.stock <= 0) throw new Error("CART_UNAVAILABLE");
          const nextQuantity = (existing?.quantity ?? 0) + quantity;
          if (nextQuantity > product.stock) throw new Error("CART_STOCK");
          if (nextQuantity > 99) throw new Error("CART_STOCK");

          const updatedItem = await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId } },
            create: { cartId: cart.id, productId, quantity: nextQuantity, priceSnapshot: product.price },
            update: { quantity: nextQuantity, priceSnapshot: product.price },
          });
          const updatedLine = { ...updatedItem, product };
          responseItems = existing
            ? liveItems.map((item) => item.id === existing.id ? updatedLine : item)
            : [...liveItems, updatedLine];
        } else if (body.action === "set") {
          const productId = typeof body.productId === "string" ? body.productId : "";
          const quantity = parseCartQuantity(body.quantity, { allowZero: true });
          if (quantity === 0) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
            responseItems = liveItems.filter((item) => item.productId !== productId);
          } else {
            const existing = liveItems.find((item) => item.productId === productId);
            const product = existing?.product ?? resolved.targetProduct ?? await tx.product.findUnique({
              where: { id: productId },
              select: { id: true, name: true, price: true, stock: true, image: true, active: true },
            });
            if (!product?.active || product.stock <= 0) throw new Error("CART_UNAVAILABLE");
            if (quantity > product.stock) throw new Error("CART_STOCK");

            const updatedItem = await tx.cartItem.upsert({
              where: { cartId_productId: { cartId: cart.id, productId } },
              create: { cartId: cart.id, productId, quantity, priceSnapshot: product.price },
              update: { quantity, priceSnapshot: product.price },
            });
            const updatedLine = { ...updatedItem, product };
            responseItems = existing
              ? liveItems.map((item) => item.id === existing.id ? updatedLine : item)
              : [...liveItems, updatedLine];
          }
        } else if (body.action === "refresh") {
          const productId = typeof body.productId === "string" ? body.productId : "";
          const existing = liveItems.find((item) => item.productId === productId);
          if (!existing) throw new InputError("المنتج غير موجود في السلة");
          const product = existing.product ?? resolved.targetProduct ?? await tx.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, price: true, stock: true, image: true, active: true },
          });
          if (!product?.active || product.stock <= 0) throw new Error("CART_UNAVAILABLE");
          if (existing.quantity > product.stock) throw new Error("CART_STOCK");
          const updatedItem = await tx.cartItem.update({
            where: { id: existing.id },
            data: { priceSnapshot: product.price },
          });
          responseItems = liveItems.map((item) => item.id === existing.id ? { ...updatedItem, product } : item);
        } else if (body.action === "remove") {
          const productId = typeof body.productId === "string" ? body.productId : "";
          await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
          responseItems = liveItems.filter((item) => item.productId !== productId);
        } else if (body.action === "clear") {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          responseItems = [];
        } else if (body.action === "sync") {
          if (liveItems.length) throw new Error("CART_NOT_EMPTY");
          if (!Array.isArray(body.items) || body.items.length > 100) throw new InputError("Invalid cart items");
          const requested = new Map<string, number>();
          for (const item of body.items) {
            if (!item || typeof item.productId !== "string") throw new InputError("Invalid cart item");
            const quantity = parseCartQuantity(item.quantity);
            requested.set(item.productId, Math.min(99, quantity + (requested.get(item.productId) ?? 0)));
          }
          const products = await tx.product.findMany({
            where: { id: { in: [...requested.keys()] }, active: true },
            select: { id: true, name: true, price: true, stock: true, image: true, active: true },
          });
          const itemsToCreate: Array<{ cartId: string; productId: string; quantity: number; priceSnapshot: any }> = [];
          for (const product of products) {
            if (product.stock <= 0) continue;
            const reqQty = requested.get(product.id) ?? 0;
            const quantity = Math.min(reqQty, product.stock);
            if (quantity > 0) {
              itemsToCreate.push({ cartId: cart.id, productId: product.id, quantity, priceSnapshot: product.price });
            }
          }
          if (itemsToCreate.length) {
            await tx.cartItem.createMany({ data: itemsToCreate });
            responseItems = await tx.cartItem.findMany({
              where: { cartId: cart.id },
              include: { product: { select: { id: true, name: true, price: true, stock: true, image: true, active: true } } },
            });
          }
        } else {
          throw new InputError("Unsupported cart action");
        }
        stages.mutationWorkMs = performance.now() - mutationStartedAt;
        stages.transactionCallbackMs = performance.now() - callbackStartedAt;

        return {
          ...resolved,
          cart: { ...cart, items: responseItems },
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
    stages.transactionMs = performance.now() - stageStartedAt;
    stages.transactionBoundaryMs = Math.max(0, stages.transactionMs - stages.transactionCallbackMs);
    stageStartedAt = performance.now();
    const response = applyCartCookie(NextResponse.json(cartPayload(result.cart)), result);
    stages.responseMs = performance.now() - stageStartedAt;
    logCartTiming(action, startedAt, stages, correlationId);
    return response;
  } catch (error) {
    logCartTiming(`${action}-error`, startedAt, stages, correlationId);
    return errorResponse(error);
  }
}
