import { db } from "@/lib/db";
import ProductCard from "@/components/storefront/ProductCard";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";
export default async function P() { const products = await db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }); const ps = products.map(publicProduct); return <><h2>كل المنتجات</h2><div className="grid">{ps.map(p => <ProductCard key={p.id} p={p} />)}</div></>; }
