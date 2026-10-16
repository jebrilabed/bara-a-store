import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Link from "next/link";
import LoadingButton from "@/components/ui/LoadingButton";
import { requireAdmin } from "@/lib/auth/authorization";
import { writeAdminAudit } from "@/lib/admin/audit";
import { Bell, BellRing, Check, CheckCheck, Inbox, Package } from "lucide-react";

export const dynamic = "force-dynamic";

async function markAllRead() {
  "use server";
  const admin = await requireAdmin();
  await db.$transaction(async (tx) => {
    const result = await tx.notification.updateMany({ where: { read: false }, data: { read: true } });
    if (result.count > 0) {
      await writeAdminAudit(tx, admin.id, "NOTIFICATIONS_MARKED_READ", "Notification", null, { count: result.count });
    }
  });
  revalidatePath("/admin/notifications");
}

async function markRead(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) return;

  await db.$transaction(async (tx) => {
    const result = await tx.notification.updateMany({ where: { id, read: false }, data: { read: true } });
    if (result.count > 0) {
      await writeAdminAudit(tx, admin.id, "NOTIFICATION_MARKED_READ", "Notification", id);
    }
  });
  revalidatePath("/admin/notifications");
}

export default async function NotificationsPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const unreadOnly = searchParams?.filter === "unread";
  const [totalCount, unreadCount, notifications] = await Promise.all([
    db.notification.count(),
    db.notification.count({ where: { read: false } }),
    db.notification.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <section className="notifications-page">
      <header className="notifications-header">
        <div>
          <span className="notifications-eyebrow">مركز المتابعة</span>
          <h2>الإشعارات</h2>
          <p>تابعي آخر تحديثات الطلبات ونشاط المتجر.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <LoadingButton className="notifications-mark-all" type="submit" pendingText="جارٍ التحديث...">
              <CheckCheck size={17} />
              <span>تحديد الكل كمقروء</span>
            </LoadingButton>
          </form>
        )}
      </header>

      <div className="notifications-summary" aria-label="ملخص الإشعارات">
        <div className="notifications-summary__item">
          <span>غير مقروءة</span>
          <strong>{unreadCount}</strong>
        </div>
        <div className="notifications-summary__item">
          <span>الإجمالي</span>
          <strong>{totalCount}</strong>
        </div>
      </div>

      <nav className="notifications-filters" aria-label="تصفية الإشعارات">
        <Link href="/admin/notifications" className={!unreadOnly ? "is-selected" : undefined} aria-current={!unreadOnly ? "page" : undefined}>
          الكل <span>{totalCount}</span>
        </Link>
        <Link href="/admin/notifications?filter=unread" className={unreadOnly ? "is-selected" : undefined} aria-current={unreadOnly ? "page" : undefined}>
          غير مقروءة <span>{unreadCount}</span>
        </Link>
      </nav>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <span className="notifications-empty__icon"><Inbox size={26} /></span>
          <h3>{unreadOnly ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات حتى الآن"}</h3>
          <p>{unreadOnly ? "أنتِ مطّلعة على كل التحديثات." : "ستظهر هنا التحديثات الجديدة من متجرك."}</p>
        </div>
      ) : (
        <ul className="notifications-list">
          {notifications.map((notification) => {
            const isOrder = notification.text.startsWith("طلب جديد");
            const Icon = isOrder ? Package : notification.read ? Bell : BellRing;

            return (
              <li key={notification.id} className={`notification-item${notification.read ? " is-read" : " is-unread"}`}>
                <span className="notification-item__icon"><Icon size={19} /></span>
                <div className="notification-item__content">
                  <div className="notification-item__message">{notification.text}</div>
                  <time dateTime={notification.createdAt.toISOString()}>
                    {notification.createdAt.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                {notification.read ? (
                  <span className="notification-item__status"><Check size={14} /> مقروء</span>
                ) : (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={notification.id} />
                    <LoadingButton className="notification-item__action" type="submit" aria-label="تحديد الإشعار كمقروء" pendingText="جارٍ...">
                      <Check size={16} />
                      <span>مقروء</span>
                    </LoadingButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {totalCount > 50 && !unreadOnly && <p className="notifications-limit">يُعرض أحدث 50 إشعارًا.</p>}
    </section>
  );
}
