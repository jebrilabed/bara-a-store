import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AddToCart from "@/components/storefront/AddToCart";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";

const productTypeLabels: Record<string, string> = {
  SKINCARE: "العناية بالبشرة",
  PERSONAL_CARE: "العناية الشخصية",
  HOME_CLEANING: "المنظفات المنزلية",
  HOME_FRAGRANCE: "العطور المنزلية",
  AIR_FRESHENER: "معطرات الهواء",
};

export default async function P({ params }: any) {
  const row = await db.product.findFirst({ where: { slug: decodeURIComponent(params.slug), active: true }, include: { category: true } }); if (!row) notFound();
  const p = publicProduct(row);
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
    <section aria-labelledby="product-details-heading">
      <h2 id="product-details-heading">تفاصيل المنتج</h2>
      {facts.length ? <div className="grid">{facts.map(([label, value]) => <article className="card" key={label}><div className="in"><b>{label}</b><p>{value}</p></div></article>)}</div> : <p>لا توجد تفاصيل إضافية مسجلة لهذا المنتج.</p>}
    </section>
  </>;
}
