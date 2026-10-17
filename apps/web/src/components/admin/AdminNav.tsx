"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  Tags,
  Boxes,
  Bell,
  Settings,
  ExternalLink,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: Package },
  { href: "/admin/products", label: "المنتجات", icon: Sparkles },
  { href: "/admin/categories", label: "الأقسام", icon: Tags },
  { href: "/admin/inventory", label: "المخزون", icon: Boxes },
  { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminNav({ storeName = "متجر براعة" }: { storeName?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="admin-sidebar" aria-label="التنقل الرئيسي">
      <div className="admin-brand">
        <img src="/logo.png" width={42} height={42} alt="" />
        <div>
          <div className="admin-brand__name">{storeName}</div>
          <div className="admin-brand__caption">لوحة التحكم</div>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav__link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <Link
          href="/ar"
          className="admin-store-link"
        >
          <ExternalLink size={15} />
          <span>زيارة المتجر</span>
        </Link>
      </div>
    </aside>
  );
}
