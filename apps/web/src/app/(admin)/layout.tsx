import "@/styles/globals.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { cairo } from "@/lib/font";
import AdminNav from "@/components/admin/AdminNav";
import NavigationProgress from "@/components/ui/NavigationProgress";
import ToastProvider from "@/components/ui/ToastProvider";
export default async function A({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); if (user?.role !== "ADMIN") redirect("/ar/login");
  return <html lang="ar" dir="rtl"><body className={cairo.className}><ToastProvider><Suspense fallback={null}><NavigationProgress /></Suspense><div className="adm"><AdminNav /><main>{children}</main></div></ToastProvider></body></html>;
}
