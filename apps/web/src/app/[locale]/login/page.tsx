import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSetting } from "@/lib/settings";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams?: { error?: string; callbackUrl?: string } }) {
  const session: any = await auth();
  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    }
    redirect(searchParams?.callbackUrl || "/ar/account");
  }

  const storeName = await getSetting("store_name", "متجر براعة");
  const callbackUrl = searchParams?.callbackUrl;
  const initialError = searchParams?.error === "admin"
    ? "هذا الحساب لا يملك صلاحية دخول لوحة الإدارة. سجّلي الدخول بحساب إداري."
    : searchParams?.error
    ? "البريد الإلكتروني أو كلمة المرور غير صحيحة. يُرجى المحاولة مجدداً."
    : undefined;

  return (
    <main className="wrap" style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: "40px 20px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#fff",
          borderRadius: "28px",
          border: "1px solid var(--line)",
          padding: "36px 32px",
          boxShadow: "0 12px 36px rgba(158, 74, 85, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <Link href="/ar" style={{ display: "inline-block", marginBottom: "12px" }}>
            <img src="/logo.png" alt={storeName} style={{ width: "64px", height: "64px", borderRadius: "50%", margin: "auto" }} />
          </Link>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
            مرحباً بعودتكِ
          </h1>
          <p style={{ color: "var(--soft)", fontSize: "0.95rem", margin: 0 }}>
            سجّلي الدخول للوصول إلى حسابكِ ومتابعة طلباتكِ
          </p>
        </div>

        <LoginForm callbackUrl={callbackUrl} initialError={initialError} />

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)", textAlign: "center", fontSize: "0.95rem", color: "var(--soft)" }}>
          ليس لديكِ حساب بعد؟{" "}
          <Link href={callbackUrl ? `/ar/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/ar/register"} style={{ color: "var(--rose-d)", fontWeight: 800, textDecoration: "underline" }}>
            إنشاء حساب جديد
          </Link>
        </div>

        <div style={{ marginTop: "14px", textAlign: "center" }}>
          <Link href="/ar" style={{ fontSize: "0.85rem", color: "var(--soft)" }}>
            ← العودة للمتجر
          </Link>
        </div>
      </div>
    </main>
  );
}
