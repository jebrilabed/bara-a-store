import "@/styles/globals.css";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { cairo } from "@/lib/font";
import AdminNav from "@/components/admin/AdminNav";
export default async function A({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); if (user?.role !== "ADMIN") redirect("/ar/login");
  return <html lang="ar" dir="rtl"><body className={cairo.className}><div className="adm"><AdminNav /><main>{children}</main></div></body></html>;
}
