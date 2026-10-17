import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import { getSetting } from "@/lib/settings";

async function register(fd: FormData) {
  "use server";
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const city = String(fd.get("city") ?? "").trim();
  const address = String(fd.get("address") ?? "").trim();

  if (
    !name ||
    name.length > 120 ||
    !city ||
    city.length > 120 ||
    !address ||
    address.length > 500 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128
  ) {
    redirect("/ar/register?error=invalid");
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) redirect("/ar/register?error=exists");

  try {
    await db.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: "CUSTOMER",
        city,
        address,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") redirect("/ar/register?error=exists");
    throw error;
  }
  await signIn("credentials", { email, password, redirectTo: "/ar/account" });
}

export default async function Register({ searchParams }: { searchParams?: { error?: string } }) {
  const storeName = await getSetting("store_name", "متجر براعة");
  const message =
    searchParams?.error === "exists"
      ? "هذا البريد الإلكتروني مسجل مسبقاً. يمكنكِ تسجيل الدخول مباشرة."
      : searchParams?.error === "invalid"
      ? "يرجى التأكد من الاسم والمدينة والعنوان والبريد، وأن كلمة المرور 8 أحرف على الأقل."
      : "";

  return (
    <main className="wrap" style={{ minHeight: "85vh", display: "grid", placeItems: "center", padding: "40px 20px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
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
            حساب جديد في {storeName}
          </h1>
          <p style={{ color: "var(--soft)", fontSize: "0.95rem", margin: 0 }}>
            انضمي إلينا لتجربة تسوق أسرع وعروض مميزة
          </p>
        </div>

        {message && (
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
            {message}
          </div>
        )}

        <form action={register} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>الاسم الكامل</span>
            <input
              name="name"
              type="text"
              placeholder="مثال: ريم الأحمد"
              maxLength={120}
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>المدينة</span>
            <input
              name="city"
              type="text"
              placeholder="مثال: نابلس"
              maxLength={120}
              required
              autoComplete="address-level2"
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>العنوان بالتفصيل</span>
            <textarea
              name="address"
              placeholder="الحي، الشارع، رقم المبنى، وأقرب علامة مميزة"
              maxLength={500}
              required
              autoComplete="street-address"
              rows={3}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none", resize: "vertical" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>البريد الإلكتروني</span>
            <input
              name="email"
              type="email"
              placeholder="example@mail.com"
              maxLength={254}
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
              placeholder="8 أحرف على الأقل"
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)", outline: "none" }}
            />
            <small style={{ color: "var(--soft)", fontSize: "0.8rem" }}>يجب أن تتكون من 8 أحرف على الأقل</small>
          </label>

          <LoadingButton
            type="submit"
            className="btn"
            pendingText="جارٍ إنشاء الحساب..."
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
            إنشاء الحساب
          </LoadingButton>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)", textAlign: "center", fontSize: "0.95rem", color: "var(--soft)" }}>
          لديكِ حساب بالفعل؟{" "}
          <Link href="/ar/login" style={{ color: "var(--rose-d)", fontWeight: 800, textDecoration: "underline" }}>
            تسجيل الدخول
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
