"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
export default function Header() {
  const { count } = useCart();
  return (<header className="top"><div className="wrap">
    <Link href="/ar" className="brand"><img src="/logo.png" alt="شعار براعة" />متجر براعة</Link>
    <nav><Link href="/ar/categories">الأقسام</Link><Link href="/ar/products">المنتجات</Link><Link href="/ar/search">بحث</Link><Link href="/ar/account">حسابي</Link></nav>
    <Link href="/ar/cart" className="btn">السلة ({count})</Link></div></header>);
}
