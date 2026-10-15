import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, canTransitionOrder } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { money } from "@/lib/settings";
import { Package, MessageCircle, ArrowUpDown, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "جديد", color: "#1D4ED8", bg: "#EFF6FF" },
  PREPARING: { label: "قيد التجهيز", color: "#B45309", bg: "#FFFBEB" },
  SHIPPED: { label: "تم الشحن", color: "#6D28D9", bg: "#F5F3FF" },
  DONE: { label: "مكتمل", color: "#15803D", bg: "#F0FDF4" },
  CANCELLED: { label: "ملغي", color: "#B91C1C", bg: "#FEF2F2" },
};

async function changeStatus(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const nextStatus = String(fd.get("status") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid order");

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new InputError("Order was not found");
    if (!canTransitionOrder(order.status, nextStatus)) throw new InputError("That order status change is not allowed", 409);
    const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: nextStatus } });
    if (!updated.count) throw new InputError("Order status changed. Refresh and try again", 409);

    if (nextStatus === "CANCELLED") {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
        }
      }
    }

    await writeAdminAudit(tx, admin.id, "ORDER_STATUS_CHANGED", "Order", id, {
      from: order.status,
      to: nextStatus,
    });
  });
  revalidatePath("/admin/orders");
  revalidatePath("/ar/orders");
}

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
            إدارة الطلبات
          </h2>
          <p style={{ color: "var(--soft)", margin: 0, fontSize: "0.95rem" }}>
            متابعة طلبات الزبائن وتحديث حالات الشحن والتجهيز
          </p>
        </div>
        <div style={{ background: "var(--blush)", padding: "8px 16px", borderRadius: "14px", fontWeight: 800, color: "var(--rose-d)" }}>
          إجمالي الطلبات: {orders.length}
        </div>
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px dashed var(--line)",
            padding: "60px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ padding: "16px", background: "var(--mist)", borderRadius: "50%", color: "var(--rose-d)", display: "flex" }}>
            <Package size={44} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
            لا توجد طلبات حتى الآن
          </h3>
          <p style={{ color: "var(--soft)", maxWidth: "420px", margin: 0, lineHeight: 1.6 }}>
            عندما يقوم الزبائن بطلب المنتجات من المتجر، ستظهر تفاصيل طلباتهم هنا مباشرة للمراجعة وتحديث حالة الشحن.
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid var(--line)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "start" }}>
              <thead>
                <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>رقم الطلب</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>العميل والهاتف</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>العنوان</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>المنتجات</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الإجمالي</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الحالة</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>التاريخ</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>تحديث الحالة</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const availableStatuses = ["NEW", "PREPARING", "SHIPPED", "DONE", "CANCELLED"].filter(
                    (status) => status === order.status || canTransitionOrder(order.status, status),
                  );
                  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "var(--ink)", bg: "var(--mist)" };
                  const formattedDate = new Date(order.createdAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "14px 18px", fontWeight: 700, fontFamily: "monospace", color: "var(--soft)" }}>
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 800 }}>{order.name}</div>
                        <a
                          href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#16A34A", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <MessageCircle size={14} />
                          <span>{order.phone}</span>
                        </a>
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: "0.9rem", maxWidth: "200px" }}>
                        <div>{order.address}</div>
                        {order.deliveryZone && (
                          <div style={{ marginTop: "5px", color: "var(--soft)", fontSize: "0.8rem" }}>
                            التوصيل إلى {order.deliveryZone} · {money(order.deliveryFee)}
                          </div>
                        )}
                        {order.receiptPublicId && (
                          <a
                            href={`/api/admin/orders/${encodeURIComponent(order.id)}/receipt`}
                            target="_blank"
                            rel="noreferrer"
                            className="order-receipt-link"
                          >
                            <ExternalLink size={13} />
                            <span>عرض إيصال التحويل</span>
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: "0.9rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {order.items.map((item) => (
                            <div key={item.id} style={{ display: "flex", gap: "6px" }}>
                              <span style={{ fontWeight: 700, color: "var(--rose-d)" }}>{item.qty}×</span>
                              <span>{item.product?.name ?? item.productNameSnapshot}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)", fontSize: "1rem" }}>
                        {money(order.total)}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "99px",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            display: "inline-block",
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: "0.85rem", color: "var(--soft)", whiteSpace: "nowrap" }}>
                        {formattedDate}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <form action={changeStatus} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input type="hidden" name="id" value={order.id} />
                          <select
                            name="status"
                            defaultValue={order.status}
                            style={{ padding: "6px 10px", borderRadius: "10px", fontSize: "0.85rem" }}
                          >
                            {availableStatuses.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]?.label ?? status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={availableStatuses.length === 1}
                            className="btn"
                            style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "10px" }}
                          >
                            حفظ
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
