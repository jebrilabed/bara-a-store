"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Heart, LayoutDashboard, LogIn } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import "./Header.css";

type HeaderProps = {
  locale: string;
  isAuthenticated: boolean;
  userRole?: string;
  storeName?: string;
};

export default function Header({ locale, isAuthenticated, userRole, storeName = "متجر براعة" }: HeaderProps) {
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const localePath = `/${locale}`;
  const isAdmin = isAuthenticated && userRole === "ADMIN";
  const accountHref = isAdmin ? "/admin" : isAuthenticated ? `${localePath}/account` : `${localePath}/login`;
  const accountLabel = isAdmin ? "لوحة التحكم" : isAuthenticated ? "حسابي" : "تسجيل الدخول";

  const primaryLinks = [
    { href: `${localePath}/categories`, label: "الأقسام" },
    { href: `${localePath}/products`, label: "المنتجات" },
    { href: `${localePath}/orders`, label: "طلباتي" },
    { href: `${localePath}/search`, label: "بحث" },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header ref={headerRef} className="top">
      <div className="wrap">
        <Link href={localePath} className="brand" onClick={closeMenu}>
          <img src="/logo.png" alt={storeName} />{storeName}
        </Link>

        <nav className="store-nav" aria-label="التنقل الرئيسي">
          {primaryLinks.map((item) => {
            const active = isActive(item.href);
            return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
          })}
        </nav>

        <div className="header-actions">
          {isAdmin ? (
            <Link
              href="/admin"
              className="header-admin-btn"
              title="لوحة التحكم"
              aria-label="لوحة التحكم"
              onClick={closeMenu}
            >
              <LayoutDashboard size={17} aria-hidden="true" />
              <span>لوحة التحكم</span>
            </Link>
          ) : isAuthenticated ? (
            <Link
              href={accountHref}
              className={`header-account${isActive(accountHref) ? " is-active" : ""}`}
              aria-label="حسابي"
              title="حسابي"
              aria-current={isActive(accountHref) ? "page" : undefined}
              onClick={closeMenu}
            >
              <CircleUserRound size={21} aria-hidden="true" />
            </Link>
          ) : (
            <Link href={accountHref} className="header-login" onClick={closeMenu}>
              <LogIn size={17} aria-hidden="true" />
              <span>تسجيل الدخول</span>
            </Link>
          )}

          <Link
            href={`${localePath}/wishlist`}
            className={`header-wishlist${isActive(`${localePath}/wishlist`) ? " is-active" : ""}`}
            aria-label={`المفضلة، عدد المنتجات ${wishlistCount}`}
            title="المفضلة"
            aria-current={isActive(`${localePath}/wishlist`) ? "page" : undefined}
            onClick={closeMenu}
          >
            <Heart size={20} aria-hidden="true" />
            {wishlistCount > 0 && <span className="header-wishlist__count" aria-hidden="true">{wishlistCount}</span>}
          </Link>

          <Link href={`${localePath}/cart`} className={`header-cart${isActive(`${localePath}/cart`) ? " is-active" : ""}`} aria-label={`السلة، عدد المنتجات ${count}`} title="السلة" aria-current={isActive(`${localePath}/cart`) ? "page" : undefined} onClick={closeMenu}>
            <span className="header-cart__visual">
              <svg className="header-cart__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.4 11.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="header-cart__count" aria-hidden="true">{count}</span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          aria-controls="mobile-store-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <aside
        id="mobile-store-menu"
        className={`mobile-store-menu${menuOpen ? " is-open" : ""}`}
        aria-label="قائمة المتجر"
        aria-hidden={!menuOpen}
      >
        <nav className="mobile-store-menu__links" aria-label="التنقل الرئيسي">
          {primaryLinks.map((item) => {
            const active = isActive(item.href);
            return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined} onClick={closeMenu}>{item.label}</Link>;
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className="mobile-store-menu__admin"
              onClick={closeMenu}
            >
              <LayoutDashboard size={18} style={{ marginInlineEnd: 8 }} aria-hidden="true" />
              <span>لوحة التحكم</span>
            </Link>
          ) : (
            <Link href={accountHref} className={`mobile-store-menu__account${isAuthenticated ? "" : " is-login"}${isActive(accountHref) ? " is-active" : ""}`} aria-current={isActive(accountHref) ? "page" : undefined} onClick={closeMenu}>{accountLabel}</Link>
          )}
          <Link href={`${localePath}/wishlist`} className={isActive(`${localePath}/wishlist`) ? "is-active" : undefined} aria-current={isActive(`${localePath}/wishlist`) ? "page" : undefined} onClick={closeMenu}>المفضلة ({wishlistCount})</Link>
          <Link href={`${localePath}/cart`} className={isActive(`${localePath}/cart`) ? "is-active" : undefined} aria-current={isActive(`${localePath}/cart`) ? "page" : undefined} onClick={closeMenu}>السلة ({count})</Link>
        </nav>
      </aside>
    </header>
  );
}
