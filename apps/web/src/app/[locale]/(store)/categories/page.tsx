import Link from "next/link";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function C() { const cs = await db.category.findMany(); return <><h2>الأقسام</h2><div className="grid">{cs.map(c => <Link key={c.id} className="cat" href={`/ar/categories/${c.slug}`}>{c.name}</Link>)}</div></>; }
