import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import OrderAutoSelect from "@/components/admin/OrderAutoSelect";
import OrderRowActions from "@/components/admin/OrderRowActions";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, canTransitionOrder } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { money } from "@/lib/settings";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";
import { deletePaymentReceipt, type UploadedReceipt } from "@/lib/cloudinary";
import { Package, MessageCircle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
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

const ORDERS_PER_PAGE = 25;
const orderListSelect = {
  id: true,
  name: true,
  phone: true,
  total: true,
  paymentMethod: true,
  paymentStatus: true,
  receiptPublicId: true,
  receiptResourceType: true,
  receiptFormat: true,
  status: true,
} satisfies Prisma.OrderSelect;

async function changeStatus(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const nextStatus = String(fd.get("status") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid order");

  const order = await db.order.findUnique({
    where: { id },
    include: { items: { select: { productId: true, qty: true } } },
  });
  if (!order) throw new InputError("Order was not found");
  if (!canTransitionOrder(order.status, nextStatus)) throw new InputError("That order status change is not allowed", 409);

  if (nextStatus === "CANCELLED") {
    const stockUpdates = order.items
      .filter((item) => item.productId)
      .map((item) =>
        db.product.update({
          where: { id: item.productId! },
          data: { stock: { increment: item.qty } },
        }),
      );
    await db.$transaction([
      db.order.update({ where: { id }, data: { status: nextStatus } }),
      ...stockUpdates,
    ]);
  } else {
    await db.order.update({ where: { id }, data: { status: nextStatus } });
  }

  writeAdminAudit(db, admin.id, "ORDER_STATUS_CHANGED", "Order", id, {
    from: order.status,
    to: nextStatus,
  }).catch((err) => console.error("[admin-audit-error]", err));
  revalidatePath("/admin/orders");
  revalidatePath("/ar/orders");
  if (nextStatus === "CANCELLED") revalidatePublicCatalog();
}

async function changePaymentStatus(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const nextPaymentStatus = String(fd.get("paymentStatus") ?? "");
  if (!id || id.length > 100 || !["PENDING", "PAID", "REFUNDED", "FAILED"].includes(nextPaymentStatus)) {
    throw new InputError("حالة الدفع غير صالحة");
  }

  const order = await db.order.findUnique({ where: { id }, select: { paymentStatus: true } });
  if (!order) throw new InputError("Order was not found");

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { paymentStatus: nextPaymentStatus } });
    await writeAdminAudit(tx, admin.id, "ORDER_PAYMENT_STATUS_CHANGED", "Order", id, {
      from: order.paymentStatus,
      to: nextPaymentStatus,
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

async function deleteOrder(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid order");

  const deletedOrder = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: { select: { productId: true, qty: true } } },
    });
    if (!order) throw new InputError("Order was not found");

    const restoreStock = order.status === "NEW" || order.status === "PREPARING";
    if (restoreStock) {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
      }
    }

    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "ORDER_DELETED",
        entityType: "Order",
        entityId: id,
        metadata: { status: order.status, paymentStatus: order.paymentStatus, total: order.total.toString() },
      },
    });
    return {
      restoreStock,
      receipt: order.receiptPublicId && order.receiptResourceType && order.receiptFormat
        ? {
            publicId: order.receiptPublicId,
            resourceType: order.receiptResourceType as UploadedReceipt["resourceType"],
            format: order.receiptFormat,
          }
        : null,
    };
  });

  if (deletedOrder.receipt) await deletePaymentReceipt(deletedOrder.receipt).catch((error) => console.error("[order-receipt-delete-error]", error));
  if (deletedOrder.restoreStock) revalidatePublicCatalog();
  revalidatePath("/admin/orders");
  revalidatePath("/ar/orders");
}

export default async function OrdersPage({ searchParams }: { searchParams?: { page?: string } }) {
  const requestedPage = Number(searchParams?.page);
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [totalOrders, requestedOrders] = await Promise.all([
    db.order.count(),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
      select: orderListSelect,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PER_PAGE));
  const currentPage = Math.min(safePage, totalPages);
  const orders = currentPage === safePage
    ? requestedOrders
    : await db.order.findMany({
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * ORDERS_PER_PAGE,
        take: ORDERS_PER_PAGE,
        select: orderListSelect,
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
          إجمالي الطلبات: {totalOrders}
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>رقم الطلب</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>العميل والهاتف</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الإجمالي</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الحالة</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>حالة الدفع</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderRecord = order as any;
                  const paymentStatus = String(orderRecord.paymentStatus || "PENDING");
                  const availableStatuses = ["NEW", "PREPARING", "SHIPPED", "DONE"].filter(
                    (status) => canTransitionOrder(order.status, status),
                  );
                  const statusOptions = [...new Set([order.status, ...availableStatuses])].map((status) => ({
                    value: status,
                    label: STATUS_LABELS[status]?.label ?? status,
                  }));
                  const paymentOptions = Object.entries(PAYMENT_STATUS_LABELS).map(([value, details]) => ({ value, label: details.label }));

                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "14px 18px", fontWeight: 700, fontFamily: "monospace" }}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          style={{ color: "var(--rose-d)", fontWeight: 800, textDecoration: "underline" }}
                          title="عرض تفاصيل الطلب"
                        >
                          #{order.id.slice(-6).toUpperCase()}
                        </Link>
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
                      <td style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)", fontSize: "1rem" }}>
                        {money(order.total)}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <OrderAutoSelect id={order.id} name="status" label="حالة الطلب" value={order.status} options={statusOptions} action={changeStatus} />
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "grid", gap: "6px" }}>
                          <OrderAutoSelect id={order.id} name="paymentStatus" label="حالة الدفع" value={paymentStatus} options={paymentOptions} action={changePaymentStatus} />
                          <small style={{ color: "var(--soft)", whiteSpace: "nowrap" }}>{order.paymentMethod === "BANK_TRANSFER" ? "تحويل بنكي" : "الدفع عند التوصيل"}</small>
                          {order.receiptPublicId && (
                            <a href={`/api/admin/orders/${encodeURIComponent(order.id)}/receipt`} target="_blank" rel="noreferrer" className="order-receipt-link">
                              <ExternalLink size={13} />
                              <span>عرض الإيصال</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <OrderRowActions
                          id={order.id}
                          status={order.status}
                          canCancel={order.status !== "CANCELLED" && canTransitionOrder(order.status, "CANCELLED")}
                          changeStatus={changeStatus}
                          deleteOrder={deleteOrder}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="row" aria-label="صفحات الطلبات">
          {currentPage > 1 && <Link className="btn o" href={`/admin/orders?page=${currentPage - 1}`}>السابق</Link>}
          <span>صفحة {currentPage} من {totalPages} · {totalOrders} طلب</span>
          {currentPage < totalPages && <Link className="btn" href={`/admin/orders?page=${currentPage + 1}`}>التالي</Link>}
        </nav>
      )}
    </div>
  );
}
