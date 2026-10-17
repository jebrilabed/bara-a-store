import { notFound } from "next/navigation";
import { getStorefrontProduct } from "@/lib/storefront/catalog";
import AddToCart from "@/components/storefront/AddToCart";
import { Check } from "lucide-react";
import styles from "./ProductDetails.module.css";
export const dynamic = "force-dynamic";

export default async function P({ params }: any) {
  const p = await getStorefrontProduct(decodeURIComponent(params.slug)); if (!p) notFound();

  return <>
    <div className="hero"><div className="blob"><img src={p.image || "/logo.png"} alt={p.name} /></div><div><h1>{p.name}</h1><p>{p.description}</p><p className="price">{p.price} ₪</p><AddToCart id={p.id} name={p.name} price={p.price} stock={p.stock} quantitySelector /></div></div>
    {p.features?.length > 0 && (
      <section className={styles.features} aria-labelledby="product-features-heading">
        <h2 id="product-features-heading">مميزات المنتج</h2>
        <ul>
          {p.features.map((feature: string, index: number) => (
            <li key={`${index}-${feature}`}><Check size={17} aria-hidden="true" /><span>{feature}</span></li>
          ))}
        </ul>
      </section>
    )}
  </>;
}
