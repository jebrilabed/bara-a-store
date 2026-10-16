import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import PreserveScrollForm from "@/components/admin/PreserveScrollForm";
import { getSetting } from "@/lib/settings";
import { revalidateStoreSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/authorization";
import { writeAdminAudit } from "@/lib/admin/audit";
import {
  Store,
  MapPin,
  CreditCard,
  Truck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
  KeyRound,
} from "lucide-react";
import { DEFAULT_DELIVERY_ZONES, parseDeliveryZones, readDeliveryZones } from "@/lib/backend-policy.mjs";
import DeliveryZonesEditor from "@/components/admin/DeliveryZonesEditor";

export const dynamic = "force-dynamic";

async function saveStoreSettings(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  let deliveryZones;
  try {
    deliveryZones = parseDeliveryZones(String(fd.get("delivery_zones") ?? ""));
  } catch {
    redirect("/admin/settings?delivery_error=invalid");
  }

  const settingsToUpdate = [
    { key: "store_name", value: String(fd.get("store_name") ?? "").trim() },
    { key: "store_description", value: String(fd.get("store_description") ?? "").trim() },
    { key: "whatsapp", value: String(fd.get("whatsapp") ?? "").trim() },
    { key: "store_email", value: String(fd.get("store_email") ?? "").trim() },
    { key: "store_address", value: String(fd.get("store_address") ?? "").trim() },
    { key: "bank_name", value: String(fd.get("bank_name") ?? "").trim() },
    { key: "bank_iban", value: String(fd.get("bank_iban") ?? "").trim() },
    { key: "bank_beneficiary", value: String(fd.get("bank_beneficiary") ?? "").trim() },
    { key: "bank_notes", value: String(fd.get("bank_notes") ?? "").trim() },
    { key: "delivery_zones", value: JSON.stringify(deliveryZones) },
  ];

  await db.$transaction(async (tx) => {
    for (const item of settingsToUpdate) {
      await tx.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: item,
      });
    }
    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "STORE_SETTINGS_BULK_UPDATED",
        entityType: "Setting",
        entityId: "store_settings",
      },
    });
  }, { maxWait: 10_000, timeout: 20_000 });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/ar", "layout");
  revalidateStoreSettings();
  redirect("/admin/settings?status=saved");
}

async function changeAdminPassword(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const currentPassword = String(fd.get("current_password") ?? "");
  const newPassword = String(fd.get("new_password") ?? "");
  const confirmPassword = String(fd.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/admin/settings?pwd_error=empty");
  }

  if (newPassword.length < 8) {
    redirect("/admin/settings?pwd_error=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/admin/settings?pwd_error=mismatch");
  }

  const user = await db.user.findUnique({ where: { id: admin.id } });
  if (!user) {
    redirect("/admin/settings?pwd_error=not_found");
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.password).catch(() => false);
  if (!passwordValid) {
    redirect("/admin/settings?pwd_error=wrong_current");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?pwd_status=changed");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { status?: string; pwd_status?: string; pwd_error?: string; delivery_error?: string };
}) {
  const [
    storeName,
    storeDescription,
    whatsapp,
    storeEmail,
    storeAddress,
    bankName,
    bankIban,
    bankBeneficiary,
    bankNotes,
    deliveryZones,
  ] = await Promise.all([
    getSetting("store_name", "متجر براعة"),
    getSetting("store_description", "عناية بالبشرة، منظفات بروائح منعشة، ومعطرات منزلية فاخرة"),
    getSetting("whatsapp", "970590000000"),
    getSetting("store_email", "contact@baraa.store"),
    getSetting("store_address", "فلسطين"),
    getSetting("bank_name", "بنك فلسطين"),
    getSetting("bank_iban", ""),
    getSetting("bank_beneficiary", "متجر براعة"),
    getSetting("bank_notes", "يرجى إرسال إيصال التحويل عبر الواتساب لتأكيد طلبك."),
    getSetting("delivery_zones", JSON.stringify(DEFAULT_DELIVERY_ZONES)),
  ]);
  const deliveryZoneList = readDeliveryZones(deliveryZones);

  const pwdErrorMessage =
    searchParams?.pwd_error === "wrong_current"
      ? "كلمة المرور الحالية غير صحيحة"
      : searchParams?.pwd_error === "mismatch"
      ? "كلمتا المرور الجديدة غير متطابقتين"
      : searchParams?.pwd_error === "short"
      ? "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"
      : searchParams?.pwd_error === "empty"
      ? "يرجى ملء جميع حقول كلمة المرور"
      : "";

  return (
    <div style={{ maxWidth: "900px", margin: "auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
          إعدادات المتجر والحساب
        </h2>
        <p style={{ color: "var(--soft)", margin: 0, fontSize: "0.95rem" }}>
          إدارة هوية المتجر، وسائل التواصل، بيانات الحساب البنكي، ومناطق التوصيل وكلمة المرور
        </p>
      </div>

      {searchParams?.status === "saved" && (
        <div
          role="status"
          style={{
            background: "#EFFBF2",
            border: "1px solid #C4EED0",
            color: "#1B7B3A",
            padding: "14px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={20} color="#1B7B3A" />
          <span>تم حفظ إعدادات المتجر بنجاح!</span>
        </div>
      )}

      {searchParams?.pwd_status === "changed" && (
        <div
          role="status"
          style={{
            background: "#EFFBF2",
            border: "1px solid #C4EED0",
            color: "#1B7B3A",
            padding: "14px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={20} color="#1B7B3A" />
          <span>تم تغيير كلمة مرور المدير بنجاح!</span>
        </div>
      )}

      {searchParams?.delivery_error === "invalid" && (
        <div role="alert" style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", color: "#C23333", padding: "14px 20px", borderRadius: "8px", fontWeight: 700 }}>
          راجعي أسماء المناطق وأسعارها، وأضيفي منطقة واحدة على الأقل قبل الحفظ.
        </div>
      )}

      {pwdErrorMessage && (
        <div
          role="alert"
          style={{
            background: "#FFF0F0",
            border: "1px solid #FFD0D0",
            color: "#C23333",
            padding: "14px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertTriangle size={20} color="#C23333" />
          <span>{pwdErrorMessage}</span>
        </div>
      )}

      {/* Main Store Settings Form */}
      <PreserveScrollForm action={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Store Profile */}
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px solid var(--line)",
            padding: "26px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ padding: "8px", background: "var(--mist)", borderRadius: "12px", color: "var(--rose-d)", display: "flex" }}>
              <Store size={22} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
              بيانات وهوية المتجر
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>اسم المتجر</span>
              <input name="store_name" defaultValue={storeName} required maxLength={100} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>البريد الإلكتروني للتواصل</span>
              <input name="store_email" type="email" defaultValue={storeEmail} required maxLength={120} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem", marginTop: "16px" }}>
            <span>وصف المتجر (يظهر في الهيدر والفوتر ومحركات البحث)</span>
            <textarea name="store_description" defaultValue={storeDescription} rows={2} maxLength={500} />
          </label>
        </div>

        {/* Section 2: Contact & Address */}
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px solid var(--line)",
            padding: "26px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ padding: "8px", background: "var(--mist)", borderRadius: "12px", color: "var(--rose-d)", display: "flex" }}>
              <MapPin size={22} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
              التواصل والعنوان
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>رقم الواتساب (للتواصل واستقبال الطلبات)</span>
              <input name="whatsapp" defaultValue={whatsapp} placeholder="مثال: 970590000000" required maxLength={32} />
              <small style={{ color: "var(--soft)", fontSize: "0.8rem" }}>اكتبي الرقم بالصيغة الدولية بدون إشارة +</small>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>العنوان / المقر</span>
              <input name="store_address" defaultValue={storeAddress} placeholder="مثال: نابلس - رفيديا" maxLength={200} />
            </label>
          </div>
        </div>

        {/* Section 3: Bank Transfer Details */}
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px solid var(--line)",
            padding: "26px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ padding: "8px", background: "var(--mist)", borderRadius: "12px", color: "var(--rose-d)", display: "flex" }}>
              <CreditCard size={22} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
              بيانات التحويل البنكي والدفع
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>اسم البنك</span>
              <input name="bank_name" defaultValue={bankName} placeholder="مثال: بنك فلسطين / البنك الإسلامي العربي" maxLength={100} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>اسم المستفيد / صاحب الحساب</span>
              <input name="bank_beneficiary" defaultValue={bankBeneficiary} placeholder="الاسم كما هو مسجل في البنك" maxLength={120} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem", marginTop: "16px" }}>
            <span>رقم الحساب أو رقم الآيبان (IBAN)</span>
            <input name="bank_iban" defaultValue={bankIban} placeholder="مثال: PS00 PALS 0000 0000 0000 0000 0000" maxLength={60} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem", marginTop: "16px" }}>
            <span>تعليمات التحويل (تظهر للزبون عند إتمام الطلب)</span>
            <textarea name="bank_notes" defaultValue={bankNotes} rows={2} maxLength={500} />
          </label>
        </div>

        {/* Section 4: Delivery Zones */}
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px solid var(--line)",
            padding: "26px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ padding: "8px", background: "var(--mist)", borderRadius: "12px", color: "var(--rose-d)", display: "flex" }}>
              <Truck size={22} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
              مناطق وتكلفة التوصيل
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>أضيفي كل منطقة وتكلفة توصيلها</span>
            <DeliveryZonesEditor initialZones={deliveryZoneList} />
            <small style={{ color: "var(--soft)", fontSize: "0.8rem" }}>
              ستظهر المناطق للزبون عند إتمام الطلب، وتُضاف تكلفة المنطقة المختارة إلى الإجمالي.
            </small>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <LoadingButton
            type="submit"
            className="btn"
            pendingText="جارٍ حفظ الإعدادات..."
            style={{
              padding: "14px 36px",
              fontSize: "1rem",
              borderRadius: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Save size={18} />
            <span>حفظ إعدادات المتجر</span>
          </LoadingButton>
        </div>
      </PreserveScrollForm>

      {/* Section 5: Password Change Form */}
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          border: "1px solid var(--line)",
          padding: "26px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div style={{ padding: "8px", background: "var(--mist)", borderRadius: "12px", color: "var(--rose-d)", display: "flex" }}>
            <Lock size={22} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
            تغيير كلمة مرور المدير
          </h3>
        </div>

        <PreserveScrollForm action={changeAdminPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>كلمة المرور الحالية</span>
              <input name="current_password" type="password" required placeholder="••••••••" />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>كلمة المرور الجديدة</span>
              <input name="new_password" type="password" required minLength={8} placeholder="8 أحرف على الأقل" />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.9rem" }}>
              <span>تأكيد كلمة المرور الجديدة</span>
              <input name="confirm_password" type="password" required minLength={8} placeholder="أعيدي كتابة كلمة المرور" />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <LoadingButton
              type="submit"
              className="btn o"
              pendingText="جارٍ تحديث كلمة المرور..."
              style={{
                padding: "12px 28px",
                fontSize: "0.95rem",
                borderRadius: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <KeyRound size={17} />
              <span>تحديث كلمة المرور</span>
            </LoadingButton>
          </div>
        </PreserveScrollForm>
      </div>
    </div>
  );
}
