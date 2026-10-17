"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Save, User, Mail, Phone, MapPin, Building2 } from "lucide-react";
import LoadingButton from "@/components/ui/LoadingButton";
import { updateProfileAction } from "./updateProfileAction";

type ProfileFormProps = {
  initialData: {
    name: string;
    email: string;
    phone: string;
    city: string;
    address: string;
  };
};

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setSuccess(false);
    setError("");

    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("phone", formData.phone);
    fd.append("city", formData.city);
    fd.append("address", formData.address);

    try {
      const res = await updateProfileAction(fd);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "حدث خطأ أثناء حفظ البيانات.");
      }
    } catch {
      setError("حدث خطأ غير متوقع. يُرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "18px",
        padding: "24px 28px",
        marginTop: "20px",
        marginBottom: "24px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
          بياناتي الشخصية
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--soft)", margin: "4px 0 0" }}>
          يمكنكِ مراجعة وتعديل بياناتكِ وعنوان التوصيل المعتمد لطلباتكِ
        </p>
      </div>

      {success && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "0.9rem",
            fontWeight: 700,
            marginBottom: "18px",
          }}
        >
          <CheckCircle2 size={18} />
          <span>تم حفظ تعديلاتكِ بنجاح!</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "0.9rem",
            fontWeight: 700,
            marginBottom: "18px",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={15} color="var(--rose-d)" />
              <span>الاسم الكامل</span>
            </span>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--line)",
                outline: "none",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Mail size={15} color="var(--soft)" />
              <span>البريد الإلكتروني (غير قابل للتعديل)</span>
            </span>
            <input
              type="email"
              disabled
              value={formData.email}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--line)",
                background: "#f8fafc",
                color: "#64748b",
                outline: "none",
                fontSize: "0.95rem",
                cursor: "not-allowed",
              }}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Phone size={15} color="var(--rose-d)" />
              <span>رقم الهاتف / الواتساب</span>
            </span>
            <input
              type="tel"
              name="phone"
              placeholder="مثال: 0599000000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--line)",
                outline: "none",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 size={15} color="var(--rose-d)" />
              <span>المنطقة / المدينة</span>
            </span>
            <input
              type="text"
              name="city"
              placeholder="مثال: رام الله / القدس / نابلس..."
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--line)",
                outline: "none",
                fontSize: "0.95rem",
              }}
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={15} color="var(--rose-d)" />
            <span>العنوان بالتفصيل (الشارع، الحي، المعلم القريب)</span>
          </span>
          <textarea
            name="address"
            rows={2}
            placeholder="مثال: شارع الإرسال، بجانب بنك فلسطين، عمارة الأمل، الطابق الثاني"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--line)",
              outline: "none",
              fontSize: "0.95rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "6px" }}>
          <LoadingButton
            type="submit"
            className="btn"
            loading={loading}
            pendingText="جارٍ الحفظ..."
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "0.95rem",
            }}
          >
            <Save size={16} />
            <span>حفظ التعديلات</span>
          </LoadingButton>
        </div>
      </form>
    </section>
  );
}
