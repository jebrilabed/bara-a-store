import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/storefront/ProductCard";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [cats, products] = await Promise.all([db.category.findMany(), db.product.findMany({ where: { active: true }, take: 8, orderBy: { id: "desc" } })]);
  const ps = products.map(publicProduct);
  return (<><div className="hero"><div><h1>تفاصيل صغيرة تصنع بيتاً وبشرة أجمل</h1><p>عناية بالبشرة، منظفات بروائح منعشة، ومعطرات منزلية.</p><Link className="btn" href="/ar/products">تسوّقي الآن</Link></div><div className="blob"><img src="/logo.png" alt="" /></div></div>
    <h2>الأقسام</h2><div className="grid">{cats.map(c => <Link key={c.id} className="cat" href={`/ar/categories/${c.slug}`}>{c.name}</Link>)}</div>
    <h2>جديدنا</h2><div className="grid">{ps.map(p => <ProductCard key={p.id} p={p} />)}</div></>);
}
