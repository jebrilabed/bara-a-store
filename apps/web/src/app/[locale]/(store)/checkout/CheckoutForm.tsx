"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import Field from "@/components/ui/Field";
import { money } from "@/lib/settings";

type DeliveryZone = { id: string; name: string; fee: string };

const RETRY_KEY = "baraa-checkout-idempotency-key";

export default function CheckoutForm({ deliveryZones }: { deliveryZones: DeliveryZone[] }) {
  const { lines, clear, reload, total } = useCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const selectedZone = deliveryZones.find((zone) => zone.id === deliveryZoneId);
  const deliveryFee = selectedZone ? Number(selectedZone.fee) : 0;

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
      await clear();
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
      <Field label="الاسم" name="name" maxLength={120} required />
      <Field label="رقم الهاتف" name="phone" type="tel" maxLength={32} required />
      <Field label="العنوان بالتفصيل" name="address" maxLength={500} required />
      <label className="checkout-zone-field">
        <span>منطقة التوصيل</span>
        <select name="deliveryZoneId" value={deliveryZoneId} onChange={(event) => setDeliveryZoneId(event.target.value)} required>
          <option value="" disabled>اختاري المنطقة</option>
          {deliveryZones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name} — {money(zone.fee)}</option>
          ))}
        </select>
      </label>
      <label className="checkout-zone-field">
        <span>إيصال التحويل البنكي <small>(اختياري)</small></span>
        <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
        <small className="checkout-receipt-hint">JPG أو PNG أو WebP أو PDF، بحد أقصى 4 ميجابايت.</small>
      </label>
      <div className="checkout-cost-summary">
        <div><span>مجموع المنتجات</span><strong>{money(total)}</strong></div>
        <div><span>تكلفة التوصيل{selectedZone ? ` إلى ${selectedZone.name}` : ""}</span><strong>{selectedZone ? money(deliveryFee) : "اختاري المنطقة"}</strong></div>
        <div className="checkout-cost-summary__total"><span>الإجمالي</span><strong>{money(total + deliveryFee)}</strong></div>
      </div>
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {lines.some((line) => line.priceChanged) && <p role="alert" style={{ color: "crimson" }}>تغيّر سعر منتج في السلة. <Link href="/ar/cart">راجعي السلة واعتمدي السعر الجديد</Link>.</p>}
      <button className="btn" disabled={!lines.length || !selectedZone || submitting || lines.some((line) => line.priceChanged)}>{submitting ? "جارٍ إرسال الطلب" : "تأكيد الطلب"}</button>
    </form>
  );
}