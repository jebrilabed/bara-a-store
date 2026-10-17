import "@/styles/globals.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { cairo } from "@/lib/font";
import AdminNav from "@/components/admin/AdminNav";
import AdminSignOut from "@/components/admin/AdminSignOut";
import NavigationProgress from "@/components/ui/NavigationProgress";
import ToastProvider from "@/components/ui/ToastProvider";
import { getSetting } from "@/lib/settings";

export default async function A({ children }: { children: React.ReactNode }) {
  const [user, storeName] = await Promise.all([
    getCurrentUser(),
    getSetting("store_name", "متجر براعة"),
  ]);
  if (!user) redirect("/ar/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/ar/login?error=admin");
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <ToastProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <div className="adm">
            <AdminNav storeName={storeName} signOutSlot={<AdminSignOut />} />
            <main>{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
