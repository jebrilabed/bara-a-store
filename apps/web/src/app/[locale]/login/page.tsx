import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import LoadingButton from "@/components/ui/LoadingButton";

import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";

export default async function Login({ searchParams }: { searchParams?: { error?: string; callbackUrl?: string } }) {
  const storeName = await getSetting("store_name", "متجر براعة");
  const hasError = Boolean(searchParams?.error);
  const callbackUrl = searchParams?.callbackUrl;
  const errorMessage = searchParams?.error === "admin"
    ? "هذا الحساب لا يملك صلاحية دخول لوحة الإدارة. سجّلي الدخول بحساب إداري."
    : "البريد الإلكتروني أو كلمة المرور غير صحيحة. يُرجى المحاولة مجدداً.";

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

        {hasError && (
          <div
            role="alert"
            style={{
              background: "#FFF0F0",
              border: "1px solid #FFD0D0",
              color: "#C23333",
              padding: "12px 16px",
              borderRadius: "14px",
              fontSize: "0.9rem",
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form
          action={async (fd: FormData) => {
            "use server";
            const email = String(fd.get("email") ?? "").trim().toLowerCase();
            const password = String(fd.get("password") ?? "");

            let targetUrl = callbackUrl || "/ar/account";
            if (!callbackUrl) {
              const existingUser = await db.user.findFirst({
                where: { email: { equals: email, mode: "insensitive" } },
                select: { role: true },
              });
              if (existingUser?.role === "ADMIN") {
                targetUrl = "/admin";
              }
            }

            try {
              await signIn("credentials", {
                email,
                password,
                redirectTo: targetUrl,
              });
            } catch (error) {
              if (error instanceof AuthError) {
                const redirectPath = callbackUrl
                  ? `/ar/login?error=invalid&callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/ar/login?error=invalid";
                redirect(redirectPath);
              }
              throw error;
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: "18px" }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>البريد الإلكتروني</span>
            <input
              name="email"
              type="email"
              placeholder="example@mail.com"
              required
              autoComplete="email"
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>كلمة المرور</span>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none" }}
            />
          </label>

          <LoadingButton
            type="submit"
            className="btn"
            pendingText="جارٍ تسجيل الدخول..."
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "1rem",
              marginTop: "8px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "16px",
            }}
          >
            تسجيل الدخول
          </LoadingButton>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)", textAlign: "center", fontSize: "0.95rem", color: "var(--soft)" }}>
          ليس لديكِ حساب بعد؟{" "}
          <Link href="/ar/register" style={{ color: "var(--rose-d)", fontWeight: 800, textDecoration: "underline" }}>
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
