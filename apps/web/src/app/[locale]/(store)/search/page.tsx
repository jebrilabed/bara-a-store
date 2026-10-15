import { db } from "@/lib/db";
import ProductCard from "@/components/storefront/ProductCard";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";
export default async function S({ searchParams }: any) {
  const q = String(searchParams.q || "").slice(0, 120); const products = q ? await db.product.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, take: 40 }) : []; const ps = products.map(publicProduct);
  return <><form className="f"><input name="q" defaultValue={q} placeholder="ابحثي عن منتج" /><button className="btn">بحث</button></form><div className="grid">{ps.map(p => <ProductCard key={p.id} p={p} />)}</div></>;
}
