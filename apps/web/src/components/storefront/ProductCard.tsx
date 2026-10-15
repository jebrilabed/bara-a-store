import Link from "next/link";
import AddToCart from "./AddToCart";
import { money } from "@/lib/settings";

export default function ProductCard({ p }: { p: any }) {
  const hasDiscount = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);

  return (
    <article className="card">
      <Link href={`/ar/products/${encodeURIComponent(p.slug)}`} className="pic" style={{ position: "relative" }}>
        <img src={p.image || "/logo.png"} alt={p.name} />
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
      <div className="in">
        <b>{p.name}</b>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span className="price">{money(p.price)}</span>
          {hasDiscount && (
            <span style={{ textDecoration: "line-through", color: "var(--soft)", fontSize: "0.85rem" }}>
              {money(p.compareAtPrice)}
            </span>
          )}
        </div>
        <AddToCart id={p.id} name={p.name} price={p.price} stock={p.stock} />
      </div>
    </article>
  );
}
