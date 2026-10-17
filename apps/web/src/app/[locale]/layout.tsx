import "@/styles/globals.css";
import { Suspense } from "react";
import { cairo } from "@/lib/font";
import NavigationProgress from "@/components/ui/NavigationProgress";
import ToastProvider from "@/components/ui/ToastProvider";
import { getSetting } from "@/lib/settings";

export async function generateMetadata() {
  const [storeName, storeDescription] = await Promise.all([
    getSetting("store_name", "متجر براعة"),
    getSetting("store_description", "عناية بالبشرة، منظفات، ومعطرات منزلية"),
  ]);
  return {
    title: {
      default: storeName,
      template: `%s | ${storeName}`,
    },
    description: storeDescription,
  };
}

export default function R({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <ToastProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
