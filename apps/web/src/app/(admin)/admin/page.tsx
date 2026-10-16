import Link from "next/link";
import { ArrowLeft, Bell, Boxes, CircleAlert, ClipboardList, MapPin, Package, Plus, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { getSetting, money } from "@/lib/settings";

export const dynamic = "force-dynamic";

const ORDER_STATUS: Record<string, string> = {
  NEW: "جديد",
  PREPARING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DONE: "مكتمل",
  CANCELLED: "ملغي",
};

type DashboardData = {
  orderCount: number;
  newOrderCount: number;
  productCount: number;
  lowStockCount: number;
  unreadNotificationCount: number;
  completedSales: string;
  recentOrders: Array<{ id: string; name: string; total: string; status: string; createdAt: string }>;
  lowStockProducts: Array<{ id: string; name: string; stock: number; image: string | null }>;
  latestProducts: Array<{ id: string; name: string; image: string | null; price: string; category: { name: string } }>;
};

export default async function DashboardPage() {
  const [data, storeAddress] = await Promise.all([
    db.$queryRaw<DashboardData[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "Order") AS "orderCount",
        (SELECT COUNT(*)::int FROM "Order" WHERE "status" = 'NEW') AS "newOrderCount",
        (SELECT COUNT(*)::int FROM "Product" WHERE "active" IS TRUE) AS "productCount",
        (SELECT COUNT(*)::int FROM "Product" WHERE "active" IS TRUE AND "stock" <= 5) AS "lowStockCount",
        (SELECT COUNT(*)::int FROM "Notification" WHERE "read" IS FALSE) AS "unreadNotificationCount",
        (SELECT COALESCE(SUM("total"), 0)::text FROM "Order" WHERE "status" = 'DONE') AS "completedSales",
        (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', recent."id", 'name', recent."name", 'total', recent."total"::text,
            'status', recent."status", 'createdAt', recent."createdAt"
          )), '[]'::jsonb)
          FROM (
            SELECT "id", "name", "total", "status", "createdAt"
            FROM "Order" ORDER BY "createdAt" DESC LIMIT 5
          ) recent
        ) AS "recentOrders",
        (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', low."id", 'name', low."name", 'stock', low."stock", 'image', low."image"
          )), '[]'::jsonb)
          FROM (
            SELECT "id", "name", "stock", "image"
            FROM "Product" WHERE "active" IS TRUE AND "stock" <= 5
            ORDER BY "stock" ASC LIMIT 5
          ) low
        ) AS "lowStockProducts",
        (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', latest."id", 'name', latest."name", 'image', latest."image",
            'price', latest."price"::text, 'category', jsonb_build_object('name', category."name")
          )), '[]'::jsonb)
          FROM (
            SELECT "id", "name", "image", "price", "categoryId"
            FROM "Product" WHERE "active" IS TRUE ORDER BY "id" DESC LIMIT 5
          ) latest
          JOIN "Category" category ON category."id" = latest."categoryId"
        ) AS "latestProducts"
    `,
    getSetting("store_address", "فلسطين"),
  ]);
  const dashboard = data[0];
  const { orderCount, newOrderCount, productCount, lowStockCount, unreadNotificationCount, completedSales, lowStockProducts, latestProducts } = dashboard;
  const recentOrders = dashboard.recentOrders.map((order) => ({ ...order, createdAt: new Date(order.createdAt) }));

  const stats = [
    { label: "مبيعات مكتملة", value: money(completedSales ?? 0), hint: "للطلبات المكتملة", icon: ShoppingBag, href: "/admin/orders", tone: "green" },
    { label: "طلبات جديدة", value: newOrderCount, hint: `من أصل ${orderCount} طلب`, icon: ClipboardList, href: "/admin/orders", tone: "rose" },
    { label: "منتجات نشطة", value: productCount, hint: "ظاهرة في المتجر", icon: Package, href: "/admin/products", tone: "gray" },
    { label: "مخزون منخفض", value: lowStockCount, hint: "5 قطع أو أقل", icon: Boxes, href: "/admin/inventory", tone: lowStockCount > 0 ? "amber" : "green" },
    { label: "إشعارات غير مقروءة", value: unreadNotificationCount, hint: "تحتاج مراجعة", icon: Bell, href: "/admin/notifications", tone: unreadNotificationCount > 0 ? "amber" : "gray" },
  ];

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">متجر براعة</span>
          <h2>لوحة التحكم</h2>
          <p>ملخص سريع لما يحتاج متابعة في متجرك.</p>
          <p style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px" }}>
            <MapPin size={15} aria-hidden="true" />
            <span>{storeAddress}</span>
          </p>
        </div>
        <div className="dashboard-header__actions">
          <Link href="/admin/orders" className="dashboard-button dashboard-button--quiet">
            <ClipboardList size={17} />
            <span>الطلبات</span>
          </Link>
          <Link href="/admin/products/new" className="dashboard-button dashboard-button--primary">
            <Plus size={17} />
            <span>إضافة منتج</span>
          </Link>
        </div>
      </header>

      <div className="dashboard-stats">
        {stats.map(({ label, value, hint, icon: Icon, href, tone }) => (
          <Link href={href} className={`dashboard-stat dashboard-stat--${tone}`} key={label}>
            <span className="dashboard-stat__icon"><Icon size={19} /></span>
            <span className="dashboard-stat__copy">
              <span className="dashboard-stat__label">{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </span>
            <ArrowLeft className="dashboard-stat__arrow" size={15} />
          </Link>
        ))}
      </div>

      <div className="dashboard-panels">
        <section className="dashboard-panel dashboard-panel--wide">
          <header className="dashboard-panel__header">
            <div>
              <h3>أحدث الطلبات</h3>
              <p>آخر الطلبات الواردة إلى المتجر</p>
            </div>
            <Link href="/admin/orders" className="dashboard-panel__link">كل الطلبات <ArrowLeft size={15} /></Link>
          </header>
          {recentOrders.length === 0 ? (
            <div className="dashboard-panel__empty">لا توجد طلبات حتى الآن.</div>
          ) : (
            <ul className="dashboard-order-list">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href="/admin/orders" className="dashboard-order">
                    <span className="dashboard-order__number">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className="dashboard-order__customer">{order.name}</span>
                    <span className={`dashboard-order__status dashboard-order__status--${order.status.toLowerCase()}`}>
                      {ORDER_STATUS[order.status] ?? order.status}
                    </span>
                    <strong className="dashboard-order__total">{money(order.total)}</strong>
                    <time dateTime={order.createdAt.toISOString()}>
                      {order.createdAt.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-panel">
          <header className="dashboard-panel__header">
            <div>
              <h3>مخزون يحتاج متابعة</h3>
              <p>المنتجات التي بقي منها 5 قطع أو أقل</p>
            </div>
            <Link href="/admin/inventory" className="dashboard-panel__link">إدارة المخزون <ArrowLeft size={15} /></Link>
          </header>
          {lowStockProducts.length === 0 ? (
            <div className="dashboard-panel__empty dashboard-panel__empty--clear">
              <Package size={18} />
              <span>المخزون بحالة جيدة.</span>
            </div>
          ) : (
            <ul className="dashboard-stock-list">
              {lowStockProducts.map((product) => (
                <li key={product.id}>
                  <Link href="/admin/inventory" className="dashboard-stock-item">
                    <img src={product.image || "/logo.png"} alt="" />
                    <span>{product.name}</span>
                    <strong className={product.stock === 0 ? "is-out" : "is-low"}>
                      {product.stock === 0 ? <><CircleAlert size={14} /> نفد</> : `${product.stock} قطع`}
                    </strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-panel">
          <header className="dashboard-panel__header">
            <div>
              <h3>أحدث المنتجات</h3>
              <p>عرض مختصر لأحدث 5 منتجات نشطة</p>
            </div>
            <Link href="/admin/products" className="dashboard-panel__link">كل المنتجات <ArrowLeft size={15} /></Link>
          </header>
          {latestProducts.length === 0 ? (
            <div className="dashboard-panel__empty">لا توجد منتجات نشطة حاليًا.</div>
          ) : (
            <ul className="dashboard-stock-list">
              {latestProducts.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${encodeURIComponent(product.id)}/edit`} className="dashboard-stock-item">
                    <img src={product.image || "/logo.png"} alt="" />
                    <span className="dashboard-product-copy">
                      <strong>{product.name}</strong>
                      <small>{product.category.name}</small>
                    </span>
                    <strong className="dashboard-product-price">{money(product.price)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
