"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { money } from "@/lib/settings";
import AddToCart from "@/components/storefront/AddToCart";
import { Heart, Trash2 } from "lucide-react";
import styles from "./Wishlist.module.css";

export default function WishlistPage() {
  const { items, remove, clear } = useWishlist();

  if (!items.length) {
    return (
      <section className={styles.empty}>
        <div className={styles.emptyIcon}>
          <Heart size={36} color="#e11d48" aria-hidden="true" />
        </div>
        <h1>قائمة المفضلة فارغة</h1>
        <p>احفظي المنتجات التي تنال إعجابكِ بالضغط على رمز القلب لتجديها هنا وتطلبيها متى تشائين.</p>
        <Link className="btn" href="/ar/products">
          استكشاف المنتجات
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>منتجاتكِ المختارة</span>
          <h1>المفضلة ({items.length})</h1>
        </div>
        <button type="button" className={styles.clearBtn} onClick={clear} title="تفريغ المفضلة">
          <Trash2 size={16} aria-hidden="true" />
          <span>إفراغ المفضلة</span>
        </button>
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            <div className={styles.imageWrap}>
              <Link href={`/ar/products/${encodeURIComponent(item.slug || item.id)}`}>
                <img src={item.image || "/logo.png"} alt={item.name} className={styles.image} />
              </Link>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => remove(item.id)}
                aria-label={`إزالة ${item.name} من المفضلة`}
                title="إزالة من المفضلة"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.content}>
              <Link href={`/ar/products/${encodeURIComponent(item.slug || item.id)}`} className={styles.title}>
                <strong>{item.name}</strong>
              </Link>
              <div className={styles.priceRow}>
                <span className={styles.price}>{money(item.price)}</span>
                {item.compareAtPrice && Number(item.compareAtPrice) > Number(item.price) && (
                  <span className={styles.comparePrice}>{money(item.compareAtPrice)}</span>
                )}
              </div>
              <div className={styles.actions}>
                <AddToCart id={item.id} name={item.name} price={item.price} stock={item.stock ?? 99} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
