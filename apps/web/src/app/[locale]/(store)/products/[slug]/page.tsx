import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontProduct } from "@/lib/storefront/catalog";
import AddToCart from "@/components/storefront/AddToCart";
import FavoriteButton from "@/components/storefront/FavoriteButton";
import { Check } from "lucide-react";
import styles from "./ProductDetails.module.css";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: {
    locale: string;
    slug: string;
  };
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const slug = params?.slug ? String(params.slug) : "";
  const product = await getStorefrontProduct(slug);
  if (!product) return { title: "المنتج غير موجود" };

  return {
    title: `${product.name} | متجر براعة`,
    description: product.description?.slice(0, 160) || product.name,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) || product.name,
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const slug = params?.slug ? String(params.slug) : "";
  const p = await getStorefrontProduct(slug);
  if (!p) notFound();

  return (
    <>
      <div className="hero">
        <div className="blob" style={{ position: "relative" }}>
          <img src={p.image || "/logo.png"} alt={p.name} />
          <FavoriteButton product={p} variant="floating" />
        </div>
        <div>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <p className="price">{p.price} ₪</p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <AddToCart id={p.id} name={p.name} price={p.price} stock={p.stock} quantitySelector />
          </div>
        </div>
      </div>
      {p.features && p.features.length > 0 && (
        <section className={styles.features} aria-labelledby="product-features-heading">
          <h2 id="product-features-heading">مميزات المنتج</h2>
          <ul>
            {p.features.map((feature: string, index: number) => (
              <li key={`${index}-${feature}`}>
                <Check size={17} aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
