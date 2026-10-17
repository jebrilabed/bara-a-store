import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { getSettings } from "@/lib/settings";
import { auth } from "@/auth";

export default async function L({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const [settings, session] = await Promise.all([
    getSettings({
      store_name: "متجر براعة",
      store_description: "وجهتك الأولى لمنتجات العناية بالبشرة والمنظفات والمعطرات المنزلية بأعلى معايير الجودة.",
      store_address: "فلسطين",
      whatsapp: "",
      store_email: "contact@baraa.store",
    }),
    auth(),
  ]);

  return (
    <CartProvider>
      <WishlistProvider>
        <Header locale={params.locale} isAuthenticated={Boolean(session?.user)} storeName={settings.store_name} />
        <main className="wrap">{children}</main>
        <Footer
          locale={params.locale}
          storeName={settings.store_name}
          storeDescription={settings.store_description}
          storeAddress={settings.store_address}
          whatsapp={settings.whatsapp}
          storeEmail={settings.store_email}
        />
      </WishlistProvider>
    </CartProvider>
  );
}
