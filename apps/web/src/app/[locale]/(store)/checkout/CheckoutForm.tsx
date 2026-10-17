"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import Field from "@/components/ui/Field";
import LoadingButton from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import { money } from "@/lib/settings";

type DeliveryZone = { id: string; name: string; fee: string };
type CustomerDetails = { name: string; phone: string; city: string; address: string };
type BankDetails = { bankName: string; bankBeneficiary: string; bankIban: string; bankNotes: string };
type PaymentMethod = "CASH_ON_DELIVERY" | "BANK_TRANSFER";

const RETRY_KEY = "baraa-checkout-idempotency-key";

export default function CheckoutForm({ deliveryZones, initialDetails, bankDetails }: { deliveryZones: DeliveryZone[]; initialDetails: CustomerDetails; bankDetails: BankDetails }) {
  const { lines, clearLocal, reload, total } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");
  const selectedZone = deliveryZones.find((zone) => zone.id === deliveryZoneId);
  const deliveryFee = selectedZone ? Number(selectedZone.fee) : 0;
  const bankTransferAvailable = Boolean(bankDetails.bankName.trim() && bankDetails.bankBeneficiary.trim() && bankDetails.bankIban.trim());
  const isBankTransfer = paymentMethod === "BANK_TRANSFER";

  async function submit(event: any) {
    event.preventDefault();
    setError("");
    if (!selectedZone) {
      setError("اختاري منطقة التوصيل لإظهار التكلفة وإتمام الطلب.");
      return;
    }
    setSubmitting(true);
    try {
      let idempotencyKey = sessionStorage.getItem(RETRY_KEY);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(RETRY_KEY, idempotencyKey);
      }
      const formData = new FormData(event.currentTarget);
      formData.set("deliveryZoneId", deliveryZoneId);
      formData.set("paymentMethod", paymentMethod);
      formData.set("idempotencyKey", idempotencyKey);
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof result.error === "string" && result.error.includes("تغيّر سعر")) await reload();
        setError(result.error || "تعذر إرسال الطلب");
        return;
      }
      sessionStorage.removeItem(RETRY_KEY);
      clearLocal();
      showToast("تم تأكيد طلبك بنجاح.");
      router.push("/ar/orders");
    } catch {
      setError("تعذر الاتصال بالمتجر. يمكنك المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="f checkout-form" onSubmit={submit}>
      <h2>إتمام الطلب</h2>
      <Field label="الاسم" name="name" maxLength={120} defaultValue={initialDetails?.name} autoComplete="name" required />
      <Field label="رقم الهاتف" name="phone" type="tel" maxLength={32} defaultValue={initialDetails.phone} autoComplete="tel" required />
      <Field label="المدينة" name="city" maxLength={120} defaultValue={initialDetails?.city} autoComplete="address-level2" required />
      <label className="checkout-zone-field">
        <span>العنوان بالتفصيل</span>
        <textarea name="address" maxLength={500} defaultValue={initialDetails?.address} autoComplete="street-address" rows={3} required />
      </label>
      <label className="checkout-zone-field">
        <span>منطقة التوصيل</span>
        <select name="deliveryZoneId" value={deliveryZoneId} onChange={(event) => setDeliveryZoneId(event.target.value)} required>
          <option value="" disabled>اختاري المنطقة</option>
          {deliveryZones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name} — {money(zone.fee)}</option>
          ))}
        </select>
      </label>
      <fieldset className="checkout-payment">
        <legend>طريقة الدفع</legend>
        <div className="checkout-payment-options" role="radiogroup" aria-label="طريقة الدفع">
          <label className={`checkout-payment-option${!isBankTransfer ? " is-selected" : ""}`}>
            <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" checked={!isBankTransfer} onChange={() => setPaymentMethod("CASH_ON_DELIVERY")} />
            <span><strong>الدفع عند التوصيل</strong><small>ادفعي عند استلام الطلب</small></span>
          </label>
          <label className={`checkout-payment-option${isBankTransfer ? " is-selected" : ""}`}>
            <input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={isBankTransfer} disabled={!bankTransferAvailable} onChange={() => setPaymentMethod("BANK_TRANSFER")} />
            <span><strong>الدفع الآن بالتحويل</strong><small>{bankTransferAvailable ? "حوّلي المبلغ وأرفقي الإيصال" : "غير متاح حتى يضيف المتجر بيانات الحساب"}</small></span>
          </label>
        </div>
      </fieldset>
      {isBankTransfer && (
        <>
          <section className="checkout-bank-details" aria-labelledby="checkout-bank-heading">
            <h3 id="checkout-bank-heading">بيانات حساب المتجر للتحويل</h3>
            <div><span>البنك</span><strong>{bankDetails.bankName || "غير محدد"}</strong></div>
            <div><span>صاحب الحساب</span><strong>{bankDetails.bankBeneficiary || "غير محدد"}</strong></div>
            <div><span>رقم الحساب / IBAN</span><strong dir="ltr">{bankDetails.bankIban || "غير محدد"}</strong></div>
            {bankDetails.bankNotes && <p>{bankDetails.bankNotes}</p>}
          </section>
          <label className="checkout-zone-field">
            <span>إيصال التحويل <small>(مطلوب)</small></span>
            <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
            <small className="checkout-receipt-hint">JPG أو PNG أو WebP أو PDF، بحد أقصى 4 ميجابايت.</small>
          </label>
        </>
      )}
      <div className="checkout-cost-summary">
        <div><span>مجموع المنتجات</span><strong>{money(total)}</strong></div>
        <div><span>تكلفة التوصيل{selectedZone ? ` إلى ${selectedZone.name}` : ""}</span><strong>{selectedZone ? money(deliveryFee) : "اختاري المنطقة"}</strong></div>
        <div className="checkout-cost-summary__total"><span>الإجمالي</span><strong>{money(total + deliveryFee)}</strong></div>
      </div>
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {lines.some((line) => line.priceChanged) && <p role="alert" style={{ color: "crimson" }}>تغيّر سعر منتج في السلة. <Link href="/ar/cart">راجعي السلة واعتمدي السعر الجديد</Link>.</p>}
      <LoadingButton
        className="btn"
        disabled={!lines.length || !selectedZone || lines.some((line) => line.priceChanged)}
        loading={submitting}
        pendingText="جارٍ إرسال الطلب..."
      >
        تأكيد الطلب
      </LoadingButton>
    </form>
  );
}