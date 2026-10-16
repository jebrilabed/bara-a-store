import "@/styles/globals.css";
import { Suspense } from "react";
import { cairo } from "@/lib/font";
import NavigationProgress from "@/components/ui/NavigationProgress";
import ToastProvider from "@/components/ui/ToastProvider";
export const metadata = { title: "متجر براعة", description: "عناية بالبشرة، منظفات، ومعطرات منزلية" };
export default function R({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl"><body className={cairo.className}><ToastProvider><Suspense fallback={null}><NavigationProgress /></Suspense>{children}</ToastProvider></body></html>; }
