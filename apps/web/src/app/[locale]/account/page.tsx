import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ArrowLeft, PackageCheck, ShoppingBag, UserRound } from "lucide-react";
import AccountSignOutButton from "./AccountSignOutButton";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: { locale: string } }) {
  const s: any = await auth();
  if (!s?.user?.id) redirect(`/${params.locale}/login`);
  if (s.user?.role === "ADMIN") redirect("/admin");

  const user = await db.user.findUnique({
    where: { id: s.user.id },
    select: { name: true, email: true, phone: true, city: true, address: true },
  });

  if (!user) redirect(`/${params.locale}/login`);

  const initialData = {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    city: user.city || "",
    address: user.address || "",
  };

  return (
    <main className="wrap account-page">
      <header className="account-header">
        <span className="account-header__icon">
          <UserRound size={26} aria-hidden="true" />
        </span>
        <div>
          <span className="account-eyebrow">مساحة حسابكِ</span>
          <h1>أهلاً {user.name || "بكِ"}</h1>
          <p>أديري بياناتكِ الشخصية، عنوان التوصيل، وتابعي طلباتكِ السابقة بكل سهولة.</p>
        </div>
      </header>

      {/* Profile Edit Form */}
      <ProfileForm initialData={initialData} />

      {/* Account Quick Navigation */}
      <nav className="account-actions" aria-label="إجراءات الحساب">
        <Link className="account-action" href={`/${params.locale}/orders`}>
          <span className="account-action__icon">
            <PackageCheck size={20} aria-hidden="true" />
          </span>
          <span className="account-action__copy">
            <strong>طلباتي</strong>
            <small>راجعي حالة وتفاصيل طلباتكِ السابقة والجارية</small>
          </span>
          <ArrowLeft className="account-action__arrow" size={17} aria-hidden="true" />
        </Link>

        <Link className="account-action" href={`/${params.locale}`}>
          <span className="account-action__icon">
            <ShoppingBag size={20} aria-hidden="true" />
          </span>
          <span className="account-action__copy">
            <strong>متابعة التسوق</strong>
            <small>اكتشفي أحدث المنتجات والعروض في المتجر</small>
          </span>
          <ArrowLeft className="account-action__arrow" size={17} aria-hidden="true" />
        </Link>
      </nav>

      <AccountSignOutButton />
    </main>
  );
}
