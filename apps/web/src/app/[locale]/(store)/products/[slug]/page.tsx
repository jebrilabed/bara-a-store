import { notFound } from "next/navigation";
import { getStorefrontProduct } from "@/lib/storefront/catalog";
import AddToCart from "@/components/storefront/AddToCart";
import { Check } from "lucide-react";
import styles from "./ProductDetails.module.css";
export const dynamic = "force-dynamic";

const productTypeLabels: Record<string, string> = {
  SKINCARE: "العناية بالبشرة",
  PERSONAL_CARE: "العناية الشخصية",
  HOME_CLEANING: "المنظفات المنزلية",
  HOME_FRAGRANCE: "العطور المنزلية",
  AIR_FRESHENER: "معطرات الهواء",
};

export default async function P({ params }: any) {
  const p = await getStorefrontProduct(decodeURIComponent(params.slug)); if (!p) notFound();
  const facts = [
    ["نوع المنتج", productTypeLabels[p.type] ?? p.type],
    ["القسم", p.category.name],
    ["الحجم / الوزن", p.packageSize],
    ["العلامة التجارية / الشركة المصنّعة", p.manufacturer],
    ["المكونات", p.ingredients],
    ["ملاءمة البشرة", p.skinSuitability],
    ["وصف الرائحة", p.scentProfile],
    ["موضع الاستخدام", p.usageArea],
    ["طريقة الاستخدام", p.usageInstructions],
    ["التحذيرات والاحتياطات", p.safetyWarnings],
    ["تعليمات التخزين", p.storageInstructions],
  ].filter((fact): fact is [string, string] => typeof fact[1] === "string" && fact[1].trim().length > 0);

  return <>
    <div className="hero"><div className="blob"><img src={p.image || "/logo.png"} alt={p.name} /></div><div><h1>{p.name}</h1><p>{p.description}</p><p className="price">{p.price} ₪</p><AddToCart id={p.id} name={p.name} price={p.price} stock={p.stock} /></div></div>
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
    <section aria-labelledby="product-details-heading">
      <h2 id="product-details-heading">تفاصيل المنتج</h2>
      {facts.length ? <div className="grid">{facts.map(([label, value]) => <article className="card" key={label}><div className="in"><b>{label}</b><p>{value}</p></div></article>)}</div> : <p>لا توجد تفاصيل إضافية مسجلة لهذا المنتج.</p>}
    </section>
  </>;
}
