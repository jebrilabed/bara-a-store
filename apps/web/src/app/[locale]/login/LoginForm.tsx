"use client";

import { useState } from "react";
import LoadingButton from "@/components/ui/LoadingButton";
import { loginAction } from "./loginAction";

export default function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [error, setError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await loginAction(fd, callbackUrl);
      if (res.success && res.redirectUrl) {
        // Hard navigation ensures that root layout is cleanly mounted and cookies are fresh
        window.location.href = res.redirectUrl;
        return;
      }
      setError(
        res.error === "admin"
          ? "هذا الحساب لا يملك صلاحية دخول لوحة الإدارة. سجّلي الدخول بحساب إداري."
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة. يُرجى المحاولة مجدداً."
      );
      setLoading(false);
    } catch {
      setError("حدث خطأ أثناء تسجيل الدخول. يُرجى المحاولة مجدداً.");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
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
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
          loading={loading}
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
    </div>
  );
}
