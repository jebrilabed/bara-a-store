"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  Menu,
  X,
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

export default function AdminNav({ storeName = "متجر براعة", signOutSlot }: { storeName?: string; signOutSlot?: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-menu-button"
          aria-label={isOpen ? "إغلاق قائمة لوحة التحكم" : "فتح قائمة لوحة التحكم"}
          aria-expanded={isOpen}
          aria-controls="admin-sidebar"
          onClick={() => setIsOpen((open) => !open)}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <div className="admin-mobile-header__title">
          <strong>{storeName}</strong>
          <span>لوحة التحكم</span>
        </div>
      </header>

      {isOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside id="admin-sidebar" className={`admin-sidebar${isOpen ? " is-open" : ""}`} aria-label="التنقل الرئيسي">
      <div className="admin-brand">
        <img src="/logo.png" width={42} height={42} alt="" />
        <div>
          <div className="admin-brand__name">{storeName}</div>
          <div className="admin-brand__caption">لوحة التحكم</div>
        </div>
        <button type="button" className="admin-sidebar__close" aria-label="إغلاق القائمة" onClick={() => setIsOpen(false)}>
          <X size={19} aria-hidden="true" />
        </button>
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
              onClick={() => setIsOpen(false)}
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
        {signOutSlot}
      </div>
      </aside>
    </>
  );
}
