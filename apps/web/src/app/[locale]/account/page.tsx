import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import LoadingButton from "@/components/ui/LoadingButton";
import { ArrowLeft, LogOut, PackageCheck, ShoppingBag, UserRound } from "lucide-react";
export default async function A() {
  const s: any = await auth();
  if (!s) redirect("/ar/login");
  if (s.user?.role === "ADMIN") redirect("/admin");
  return (
    <main className="wrap account-page">
      <header className="account-header">
        <span className="account-header__icon"><UserRound size={25} aria-hidden="true" /></span>
        <div>
          <span className="account-eyebrow">مساحة حسابك</span>
          <h1>أهلاً {s.user.name || "بكِ"}</h1>
          <p>تابعي طلباتكِ وعودي إلى التسوق متى شئتِ.</p>
        </div>
      </header>

      <nav className="account-actions" aria-label="إجراءات الحساب">
        <Link className="account-action" href="/ar/orders">
          <span className="account-action__icon"><PackageCheck size={20} aria-hidden="true" /></span>
          <span className="account-action__copy"><strong>طلباتي</strong><small>راجعي حالة الطلبات السابقة</small></span>
          <ArrowLeft className="account-action__arrow" size={17} aria-hidden="true" />
        </Link>
        <Link className="account-action" href="/ar">
          <span className="account-action__icon"><ShoppingBag size={20} aria-hidden="true" /></span>
          <span className="account-action__copy"><strong>متابعة التسوق</strong><small>اكتشفي المنتجات والأقسام</small></span>
          <ArrowLeft className="account-action__arrow" size={17} aria-hidden="true" />
        </Link>
        {s.user.role === "ADMIN" && (
          <Link className="account-action" href="/admin">
            <span className="account-action__icon"><UserRound size={20} aria-hidden="true" /></span>
            <span className="account-action__copy"><strong>لوحة الإدارة</strong><small>إدارة المتجر والطلبات</small></span>
            <ArrowLeft className="account-action__arrow" size={17} aria-hidden="true" />
          </Link>
        )}
      </nav>

      <form className="account-signout" action={async () => { "use server"; await signOut({ redirectTo: "/ar" }); }}>
        <LoadingButton className="account-signout__button" pendingText="جارٍ تسجيل الخروج...">
          <LogOut size={17} aria-hidden="true" />
          <span>تسجيل الخروج</span>
        </LoadingButton>
      </form>
    </main>
  );
}
