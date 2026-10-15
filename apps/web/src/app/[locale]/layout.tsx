import "@/styles/globals.css";
import { cairo } from "@/lib/font";
export const metadata = { title: "متجر براعة", description: "عناية بالبشرة، منظفات، ومعطرات منزلية" };
export default function R({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl"><body className={cairo.className}>{children}</body></html>; }
