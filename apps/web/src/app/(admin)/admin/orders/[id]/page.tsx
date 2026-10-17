import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { money } from "@/lib/settings";
import { canTransitionOrder, InputError } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";
import LoadingButton from "@/components/ui/LoadingButton";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Printer,
  ShieldAlert,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "جديد", color: "#1D4ED8", bg: "#EFF6FF" },
  PREPARING: { label: "قيد التجهيز", color: "#B45309", bg: "#FFFBEB" },
  SHIPPED: { label: "تم الشحن", color: "#6D28D9", bg: "#F5F3FF" },
  DONE: { label: "مكتمل", color: "#15803D", bg: "#F0FDF4" },
  CANCELLED: { label: "ملغي", color: "#B91C1C", bg: "#FEF2F2" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "بانتظار الدفع", color: "#B45309", bg: "#FFFBEB" },
  PAID: { label: "تم الدفع", color: "#15803D", bg: "#F0FDF4" },
  REFUNDED: { label: "مسترد", color: "#64748B", bg: "#F1F5F9" },
  FAILED: { label: "فشل الدفع", color: "#B91C1C", bg: "#FEF2F2" },
};

async function changeOrderStatus(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const nextStatus = String(fd.get("status") ?? "");

  const order = await db.order.findUnique({
    where: { id },
    include: { items: { select: { productId: true, qty: true } } },
  });
  if (!order) throw new InputError("Order not found");
  if (!canTransitionOrder(order.status, nextStatus)) {
    throw new InputError("هذا التغيير في حالة الطلب غير مسموح", 409);
  }

  await db.$transaction(async (tx) => {
    if (nextStatus === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
      }
    } else if (order.status === "CANCELLED" && nextStatus !== "CANCELLED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        if (!currentProduct || currentProduct.stock < item.qty) {
          throw new InputError("المخزون غير كافٍ لإعادة تفعيل الطلب", 409);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }
    }

    await tx.order.update({
      where: { id },
      data: { status: nextStatus },
    });

    await writeAdminAudit(
      tx,
      admin.id,
      "ORDER_STATUS_CHANGED",
      "Order",
      id,
      { from: order.status, to: nextStatus }
    );
  });

  revalidatePublicCatalog();
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

async function changePaymentStatus(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const nextPaymentStatus = String(fd.get("paymentStatus") ?? "");

  if (!["PENDING", "PAID", "REFUNDED", "FAILED"].includes(nextPaymentStatus)) {
    throw new InputError("حالة الدفع غير صالحة");
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) throw new InputError("Order not found");

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { paymentStatus: nextPaymentStatus },
    });

    await writeAdminAudit(
      tx,
      admin.id,
      "ORDER_PAYMENT_STATUS_CHANGED",
      "Order",
      id,
      { from: (order as any).paymentStatus, to: nextPaymentStatus }
    );
  });

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true, skuCode: true },
          },
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const orderRecord = order as any;
  const paymentStatus = orderRecord.paymentStatus || "PENDING";
  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? {
    label: order.status,
    color: "#475569",
    bg: "#F1F5F9",
  };
  const paymentInfo = PAYMENT_STATUS_LABELS[paymentStatus] ?? {
    label: paymentStatus,
    color: "#475569",
    bg: "#F1F5F9",
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const availableStatuses = ["NEW", "PREPARING", "SHIPPED", "DONE", "CANCELLED"].filter(
    (status) => status === order.status || canTransitionOrder(order.status, status),
  );

  const cleanPhone = order.phone.replace(/[^0-9]/g, "");
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const totalAmount = Number(order.total);
  const subtotal = totalAmount - deliveryFee;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 0 60px" }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <Link
          href="/admin/orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--rose-d)",
            fontWeight: 700,
            fontSize: "0.95rem",
          }}
        >
          <ArrowRight size={18} />
          <span>العودة إلى قائمة الطلبات</span>
        </Link>
      </div>

      {/* Main Order Header Banner */}
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          border: "1px solid var(--line)",
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--ink)", margin: 0 }}>
              طلب رقم #{order.id.slice(-6).toUpperCase()}
            </h1>
            <span
              style={{
                background: statusInfo.bg,
                color: statusInfo.color,
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 800,
              }}
            >
              حالة الطلب: {statusInfo.label}
            </span>
            <span
              style={{
                background: paymentInfo.bg,
                color: paymentInfo.color,
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 800,
              }}
            >
              حالة الدفع: {paymentInfo.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--soft)", fontSize: "0.88rem", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={15} />
              <span>{formattedDate}</span>
            </span>
            <span>•</span>
            <span style={{ fontFamily: "monospace" }}>معرف الطلب: {order.id}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${order.name}، بخصوص طلبك رقم #${order.id.slice(-6).toUpperCase()} من متجر براعة`)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "12px",
              background: "#22c55e",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            <MessageCircle size={17} />
            <span>واتساب العميل</span>
          </a>
        </div>
      </div>

      {/* Grid Layout: Left Column (Actions) & Right Column (Details) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* Right / Main Details */}
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Customer & Delivery Card */}
          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={19} color="var(--rose-d)" />
              <span>بيانات العميل والتوصيل</span>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--soft)", display: "block" }}>اسم العميل</span>
                <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{order.name}</strong>
              </div>

              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--soft)", display: "block" }}>رقم الهاتف</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <a href={`tel:${order.phone}`} style={{ fontWeight: 800, color: "var(--rose-d)", direction: "ltr" }}>
                    {order.phone}
                  </a>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--soft)", display: "block" }}>المدينة / المنطقة</span>
                <strong style={{ fontSize: "0.95rem" }}>{order.city || "غير محدد"}</strong>
              </div>

              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--soft)", display: "block" }}>منطقة التوصيل المقدرة</span>
                <strong style={{ fontSize: "0.95rem" }}>{order.deliveryZone || "غير محدد"}</strong>
              </div>
            </div>

            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--soft)", display: "block", marginBottom: "4px" }}>
                العنوان بالتفصيل
              </span>
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5, color: "var(--ink)", background: "var(--mist)", padding: "10px 14px", borderRadius: "10px" }}>
                <MapPin size={15} style={{ verticalAlign: "middle", marginInlineEnd: 6, color: "var(--rose-d)" }} />
                {order.address}
              </p>
            </div>
          </section>

          {/* Ordered Products Card */}
          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Package size={19} color="var(--rose-d)" />
              <span>المنتجات المطلوبة ({order.items.length})</span>
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "10px 14px", textAlign: "start", fontSize: "0.85rem", color: "var(--soft)" }}>المنتج</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.85rem", color: "var(--soft)" }}>الكمية</th>
                    <th style={{ padding: "10px 14px", textAlign: "start", fontSize: "0.85rem", color: "var(--soft)" }}>سعر الوحدة</th>
                    <th style={{ padding: "10px 14px", textAlign: "start", fontSize: "0.85rem", color: "var(--soft)" }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const itemTotal = Number(item.price) * item.qty;
                    const img = item.product?.image || item.productImageSnapshot || "/logo.png";
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img
                              src={img}
                              alt=""
                              style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", background: "#f8fafc" }}
                            />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--ink)" }}>
                                {item.product?.name || item.productNameSnapshot}
                              </div>
                              {item.skuCodeSnapshot && (
                                <span style={{ fontSize: "0.75rem", color: "var(--soft)", fontFamily: "monospace" }}>
                                  كود: {item.skuCodeSnapshot}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800 }}>
                          ×{item.qty}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: "0.92rem" }}>
                          {money(Number(item.price))}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 800, color: "var(--rose-d)" }}>
                          {money(itemTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1.5px dashed var(--line)", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.9rem", color: "var(--soft)" }}>
                <span>مجموع المنتجات:</span>
                <span>{money(subtotal > 0 ? subtotal : 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.9rem", color: "var(--soft)" }}>
                <span>رسوم التوصيل:</span>
                <span>{money(deliveryFee)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "1.15rem", fontWeight: 900, color: "var(--rose-d)", paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                <span>المبلغ الإجمالي:</span>
                <span>{money(totalAmount)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Left Column / Control & Status Cards */}
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Order Status Controller */}
          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={19} color="var(--rose-d)" />
              <span>تحديث حالة الطلب</span>
            </h2>

            <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "10px", background: statusInfo.bg, color: statusInfo.color, fontWeight: 800, fontSize: "0.95rem" }}>
              الحالة الحالية: {statusInfo.label}
            </div>

            <form action={changeOrderStatus} style={{ display: "grid", gap: "12px" }}>
              <input type="hidden" name="id" value={order.id} />
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", fontWeight: 700 }}>
                <span>الانتقال إلى حالة جديدة:</span>
                <select
                  name="status"
                  defaultValue={order.status}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--line)",
                    outline: "none",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>
                      {ORDER_STATUS_LABELS[st]?.label ?? st}
                    </option>
                  ))}
                </select>
              </label>

              <LoadingButton
                type="submit"
                className="btn"
                pendingText="جارٍ التحديث..."
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  marginTop: "4px",
                }}
              >
                تحديث حالة الطلب
              </LoadingButton>
            </form>
          </section>

          {/* Payment Status Controller */}
          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={19} color="var(--rose-d)" />
              <span>حالة وطريقة الدفع</span>
            </h2>

            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "10px", background: paymentInfo.bg, color: paymentInfo.color, fontWeight: 800, fontSize: "0.95rem" }}>
              حالة الدفع الحالية: {paymentInfo.label}
            </div>

            <div style={{ fontSize: "0.88rem", color: "var(--soft)", marginBottom: "14px" }}>
              <strong>طريقة الدفع:</strong>{" "}
              {order.paymentMethod === "BANK_TRANSFER" ? "تحويل بنكي" : "الدفع عند الاستلام (كاش)"}
            </div>

            {/* Bank Transfer Receipt Attachment */}
            {order.paymentMethod === "BANK_TRANSFER" && (
              <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "12px", background: "var(--mist)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                  إيصال التحويل البنكي:
                </span>
                {order.receiptPublicId ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <a
                      href={`/api/admin/orders/${order.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--rose-d)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        textDecoration: "underline",
                      }}
                    >
                      <ExternalLink size={15} />
                      <span>فتح ومعاينة صورة الإيصال</span>
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: "0.82rem", color: "var(--soft)" }}>لم يتم إرفاق إيصال بعد</span>
                )}
              </div>
            )}

            <form action={changePaymentStatus} style={{ display: "grid", gap: "12px" }}>
              <input type="hidden" name="id" value={order.id} />
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", fontWeight: 700 }}>
                <span>تغيير حالة الدفع:</span>
                <select
                  name="paymentStatus"
                  defaultValue={paymentStatus}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--line)",
                    outline: "none",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="PENDING">بانتظار الدفع (غير مدفوع)</option>
                  <option value="PAID">تم الدفع (مدفوع)</option>
                  <option value="REFUNDED">مسترد (تم إرجاع المبلغ)</option>
                  <option value="FAILED">فشل الدفع</option>
                </select>
              </label>

              <LoadingButton
                type="submit"
                className="btn"
                pendingText="جارٍ التحديث..."
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  marginTop: "4px",
                }}
              >
                تحديث حالة الدفع
              </LoadingButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
