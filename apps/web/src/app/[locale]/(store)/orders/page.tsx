import { auth } from "@/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/settings";
import Link from "next/link";
import { CalendarDays, ChevronDown, MapPin, Package, ShoppingBag } from "lucide-react";
import styles from "./Orders.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  PREPARING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DONE: "مكتمل",
  CANCELLED: "ملغي",
};

export default async function O() {
  const session: any = await auth();
  if (!session?.user?.id) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>متابعة مشترياتك</span>
          <h1>طلباتي</h1>
        </header>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Package size={25} aria-hidden="true" /></span>
          <h2>سجّلي الدخول لمتابعة طلباتك</h2>
          <p>بعد تسجيل الدخول ستجدين حالة طلباتك وتفاصيلها هنا.</p>
          <Link href="/ar/login" className={styles.primaryLink}>تسجيل الدخول</Link>
        </div>
      </section>
    );
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      total: true,
      status: true,
      city: true,
      address: true,
      deliveryZone: true,
      deliveryFee: true,
      items: {
        select: {
          qty: true,
          productNameSnapshot: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>متابعة مشترياتك</span>
          <h1>طلباتي</h1>
        </div>
        <span className={styles.orderCount}>{orders.length} طلبات</span>
      </header>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><ShoppingBag size={25} aria-hidden="true" /></span>
          <h2>لا توجد طلبات حتى الآن</h2>
          <p>ستظهر طلباتك هنا بعد إتمام عملية الشراء.</p>
          <Link href="/ar/products" className={styles.primaryLink}>استكشاف المنتجات</Link>
        </div>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <article className={styles.order} key={order.id}>
              <div className={styles.orderHeader}>
                <div className={styles.orderIdentity}>
                  <span className={styles.orderIcon}><Package size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>طلب #{order.id.slice(-6).toUpperCase()}</strong>
                    <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${styles[`status${order.status}`] ?? ""}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <div className={styles.orderTotal}>
                <span>إجمالي الطلب</span>
                <strong>{money(order.total)}</strong>
              </div>

              {(order.city || order.address || order.deliveryZone) && (
                <div className={styles.delivery}>
                  <MapPin size={16} aria-hidden="true" />
                  <div>
                    {order.city && <strong>{order.city}</strong>}
                    {order.address && <span>{order.address}</span>}
                    {order.deliveryZone && <small>التوصيل إلى {order.deliveryZone} · {money(order.deliveryFee)}</small>}
                  </div>
                </div>
              )}

              <details className={styles.details}>
                <summary><span>تفاصيل المنتجات ({order.items.length})</span><ChevronDown size={17} aria-hidden="true" /></summary>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-${index}`}>
                      <span>{item.productNameSnapshot || item.product?.name || "منتج"}</span>
                      <strong>× {item.qty}</strong>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
