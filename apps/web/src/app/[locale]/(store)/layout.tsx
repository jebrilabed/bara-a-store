import { CartProvider } from "@/lib/cart";
import Header from "@/components/storefront/Header";
import { getSetting } from "@/lib/settings";
import { auth } from "@/auth";

export default async function L({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const storeAddress = await getSetting("store_address", "فلسطين");
  const session = await auth();
  return <CartProvider><Header locale={params.locale} isAuthenticated={Boolean(session?.user)} /><main className="wrap">{children}</main><footer className="ft">© 2026 متجر براعة · العنوان: {storeAddress}</footer></CartProvider>;
}
