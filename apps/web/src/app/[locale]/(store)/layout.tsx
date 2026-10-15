import { CartProvider } from "@/lib/cart";
import Header from "@/components/storefront/Header";
export default function L({ children }: { children: React.ReactNode }) {
  return <CartProvider><Header /><main className="wrap">{children}</main><footer className="ft">© 2026 متجر براعة</footer></CartProvider>;
}
