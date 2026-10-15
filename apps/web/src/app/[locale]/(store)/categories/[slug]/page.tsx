import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductCard from "@/components/storefront/ProductCard";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";
export default async function C({ params }: any) {
  const c = await db.category.findUnique({ where: { slug: params.slug }, include: { products: { where: { active: true }, orderBy: { name: "asc" } } } }); if (!c) notFound();
  return <><h2>{c.name}</h2><div className="grid">{c.products.map(p => <ProductCard key={p.id} p={publicProduct(p)} />)}</div></>;
}
