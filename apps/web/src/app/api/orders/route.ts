import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/authorization";
import { DEFAULT_DELIVERY_ZONES, InputError, parseCheckoutInput, readDeliveryZones } from "@/lib/backend-policy.mjs";
import { getSetting } from "@/lib/settings";
import { deletePaymentReceipt, uploadPaymentReceipt, type UploadedReceipt } from "@/lib/cloudinary";
import { CART_COOKIE_NAME, hashCartToken, validCartToken } from "@/lib/storefront/cart-storage";

export const dynamic = "force-dynamic";
const ORDER_TOTAL_MAX = new Prisma.Decimal("9999999999.99");

function responseError(error: unknown) {
  if (error instanceof InputError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  if (error instanceof Error && error.message.startsWith("ORDER_")) {
    const messages: Record<string, string> = {
      ORDER_EMPTY: "سلتك فارغة",
      ORDER_UNAVAILABLE: "أحد المنتجات لم يعد متاحاً",
      ORDER_STOCK: "الكمية المطلوبة غير متوفرة حالياً",
      ORDER_PRICE_CHANGED: "تغيّر سعر منتج. راجعي السلة واعتمدي السعر الجديد ثم أعيدي المحاولة.",
      ORDER_TOTAL: "تعذر حساب إجمالي الطلب",
    };
    const status = error.message === "ORDER_EMPTY" ? 400 : 409;
    return NextResponse.json({ error: messages[error.message] ?? "تعذر إنشاء الطلب" }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "تعذر إنشاء الطلب" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  let retryKey: string | null = null;
  let uploadedReceipt: UploadedReceipt | null = null;
  let matchesOwner: ((order: { userId: string | null; guestTokenHash: string | null }) => boolean) | null = null;
  try {
    let body: unknown;
    let receiptFile: FormDataEntryValue | null = null;
    try {
      if (request.headers.get("content-type")?.includes("multipart/form-data")) {
        const formData = await request.formData();
        body = {
          name: formData.get("name"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          deliveryZoneId: formData.get("deliveryZoneId"),
          idempotencyKey: formData.get("idempotencyKey"),
        };
        receiptFile = formData.get("receipt");
      } else {
        body = await request.json();
      }
    } catch { throw new InputError("بيانات الطلب غير صالحة"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("بيانات الطلب غير صالحة");
    const input = parseCheckoutInput(body);
    retryKey = input.idempotencyKey;
    const user = await getCurrentUser();
    const guestToken = request.cookies.get(CART_COOKIE_NAME)?.value;
    const guestTokenHash = !user && validCartToken(guestToken) ? hashCartToken(guestToken) : null;
    if (!user && !guestTokenHash) throw new InputError("انتهت صلاحية السلة. أعيدي تحميل صفحة السلة ثم حاولي مرة أخرى", 409);

    matchesOwner = (order: { userId: string | null; guestTokenHash: string | null }) =>
      user ? order.userId === user.id : order.userId === null && order.guestTokenHash === guestTokenHash;
    const prior = await db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, userId: true, guestTokenHash: true },
    });
    if (prior) {
      if (!matchesOwner(prior)) throw new InputError("تعذر تأكيد محاولة الطلب", 409);
      return NextResponse.json({ id: prior.id }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const deliveryZonesValue = await getSetting("delivery_zones", JSON.stringify(DEFAULT_DELIVERY_ZONES));
    const deliveryZone = readDeliveryZones(deliveryZonesValue).find((zone) => zone.id === input.deliveryZoneId);
    if (!deliveryZone) throw new InputError("منطقة التوصيل المختارة غير متاحة، حدّثي الصفحة واختاري منطقة أخرى", 409);
    const deliveryFee = new Prisma.Decimal(deliveryZone.fee);
    uploadedReceipt = await uploadPaymentReceipt(receiptFile);

    const order = await db.$transaction(async (tx) => {
      const now = new Date();
      const ownerWhere = user
        ? { userId: user.id }
        : { guestTokenHash: guestTokenHash as string };
      const candidate = await tx.cart.findFirst({
        where: { ...ownerWhere, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!candidate) throw new Error("ORDER_EMPTY");

      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${candidate.id} AND "status" = 'ACTIVE' FOR UPDATE`;
      const cart = await tx.cart.findFirst({
        where: { id: candidate.id, ...ownerWhere, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        include: { items: { include: { product: true } } },
      });
      if (!cart?.items.length) throw new Error("ORDER_EMPTY");

      let total = deliveryFee;
      const orderItems: Array<{
        productId: string;
        productNameSnapshot: string;
        productImageSnapshot: string | null;
        skuCodeSnapshot: string | null;
        qty: number;
        price: Prisma.Decimal;
      }> = [];

      const orderedLines = [...cart.items].sort((left, right) => left.productId.localeCompare(right.productId));
      for (const line of orderedLines) {
        if (!line.product.active) throw new Error("ORDER_UNAVAILABLE");
        const stockUpdate = await tx.product.updateMany({
          where: { id: line.productId, active: true, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (stockUpdate.count !== 1) {
          const latest = await tx.product.findUnique({ where: { id: line.productId }, select: { active: true } });
          if (!latest?.active) throw new Error("ORDER_UNAVAILABLE");
          throw new Error("ORDER_STOCK");
        }
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.active) throw new Error("ORDER_UNAVAILABLE");
        if (!line.priceSnapshot.equals(product.price)) throw new Error("ORDER_PRICE_CHANGED");
        total = total.plus(product.price.mul(line.quantity));
        orderItems.push({
          productId: product.id,
          productNameSnapshot: product.name,
          productImageSnapshot: product.image,
          skuCodeSnapshot: product.skuCode,
          qty: line.quantity,
          price: product.price,
        });
      }
      if (total.greaterThan(ORDER_TOTAL_MAX)) throw new Error("ORDER_TOTAL");

      const created = await tx.order.create({
        data: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          total,
          deliveryZone: deliveryZone.name,
          deliveryFee,
          receiptPublicId: uploadedReceipt?.publicId ?? null,
          receiptResourceType: uploadedReceipt?.resourceType ?? null,
          receiptFormat: uploadedReceipt?.format ?? null,
          status: "NEW",
          userId: user?.id ?? null,
          guestTokenHash,
          idempotencyKey: input.idempotencyKey,
          items: { create: orderItems },
        },
      });
      await tx.notification.create({ data: { text: `طلب جديد ${created.id} بقيمة ${total.toFixed(2)} ₪` } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    }, { maxWait: 10_000, timeout: 20_000 });

    return NextResponse.json({ id: order.id }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    if (uploadedReceipt) {
      await deletePaymentReceipt(uploadedReceipt).catch(() => undefined);
    }
    if (retryKey && matchesOwner) {
      try {
        const existing = await db.order.findUnique({
          where: { idempotencyKey: retryKey },
          select: { id: true, userId: true, guestTokenHash: true },
        });
        if (existing) {
          if (!matchesOwner(existing)) return responseError(new InputError("تعذر تأكيد محاولة الطلب", 409));
          return NextResponse.json({ id: existing.id }, { headers: { "Cache-Control": "private, no-store" } });
        }
      } catch {}
    }
    return responseError(error);
  }
}
