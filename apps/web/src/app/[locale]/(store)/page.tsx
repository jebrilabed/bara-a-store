import Link from "next/link";
import { getStorefrontHomeData } from "@/lib/storefront/catalog";
import ProductCard from "@/components/storefront/ProductCard";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { categories: cats, products: ps } = await getStorefrontHomeData();
  return (<><div className="hero"><div><h1>تفاصيل صغيرة تصنع بيتاً وبشرة أجمل</h1><p>عناية بالبشرة، منظفات بروائح منعشة، ومعطرات منزلية.</p><Link className="btn" href="/ar/products">تسوّقي الآن</Link></div><div className="blob"><img src="/logo.png" alt="" /></div></div>
    <h2>الأقسام</h2><div className="grid">{cats.map(c => <Link key={c.id} className="cat" href={`/ar/categories/${c.slug}`}>{c.name}</Link>)}</div>
    <h2>جديدنا</h2><div className="grid">{ps.map(p => <ProductCard key={p.id} p={p} />)}</div></>);
}
