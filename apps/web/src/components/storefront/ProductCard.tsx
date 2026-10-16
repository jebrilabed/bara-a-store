import Link from "next/link";
import AddToCart from "./AddToCart";
import "./ProductCard.css";
import { money } from "@/lib/settings";

export default function ProductCard({ p }: { p: any }) {
  const hasDiscount = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);

  return (
    <article className="card product-card">
      <Link href={`/ar/products/${encodeURIComponent(p.slug)}`} className="pic product-card__image-link" style={{ position: "relative" }}>
        <img className={p.image ? "product-card-image" : "product-card-image product-card-image--placeholder"} src={p.image || "/logo.png"} alt={p.name} />
        {hasDiscount && (
          <span
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "var(--rose)",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: "99px",
            }}
          >
            خصم
          </span>
        )}
      </Link>
      <div className="in product-card__content">
        <b className="product-card__name">{p.name}</b>
        <div className="product-card__price">
          <span className="price">{money(p.price)}</span>
          {hasDiscount && (
            <span style={{ textDecoration: "line-through", color: "var(--soft)", fontSize: "0.85rem" }}>
              {money(p.compareAtPrice)}
            </span>
          )}
        </div>
        <div className="product-card__footer">
          <AddToCart id={p.id} name={p.name} price={p.price} stock={p.stock} />
        </div>
      </div>
    </article>
  );
}
