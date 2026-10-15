import "@/styles/globals.css";
import { cairo } from "@/lib/font";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  );
}
