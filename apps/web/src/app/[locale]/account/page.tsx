import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
export default async function A() {
  const s: any = await auth(); if (!s) redirect("/ar/login");
  return (<main className="wrap"><h2>أهلاً {s.user.name}</h2><div className="row"><Link className="btn" href="/ar/orders">طلباتي</Link><Link className="btn o" href="/ar">المتجر</Link>
    {s.user.role === "ADMIN" && <Link className="btn o" href="/admin">لوحة الإدارة</Link>}
    <form action={async () => { "use server"; await signOut({ redirectTo: "/ar" }); }}><button className="btn o">خروج</button></form></div></main>);
}
