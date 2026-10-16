import Link from "next/link";
import { getStorefrontCategories } from "@/lib/storefront/catalog";
export const dynamic = "force-dynamic";
export default async function C() { const cs = await getStorefrontCategories(); return <><h2>الأقسام</h2><div className="grid">{cs.map(c => <Link key={c.id} className="cat" href={`/ar/categories/${c.slug}`}>{c.name}</Link>)}</div></>; }
