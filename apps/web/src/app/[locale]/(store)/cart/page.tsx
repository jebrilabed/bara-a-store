"use client";

import { useState } from "react";
import Link from "next/link";
import LoadingButton from "@/components/ui/LoadingButton";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/settings";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

export default function Cart() {
  const { lines, set, refresh, total, error, mutating } = useCart();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function runAction(key: string, action: () => Promise<void>) {
    if (busyKey || mutating) return;
    setBusyKey(key);
    try {
      await action();
    } catch {
    } finally {
      setBusyKey(null);
    }
  }

  if (!lines.length) {
    return (
      <section className="cart-page cart-page--empty">
        <span className="cart-empty__icon"><ShoppingBag size={27} aria-hidden="true" /></span>
        <h1>سلتك فارغة</h1>
        <p>اختاري ما يعجبكِ من منتجات المتجر، وستجدينه هنا.</p>
        <Link className="btn" href="/ar/products">استكشاف المنتجات</Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <header className="cart-header">
        <div>
          <span className="cart-eyebrow">مراجعة مشترياتك</span>
          <h1>سلة التسوق</h1>
        </div>
        <span className="cart-header__count">{lines.reduce((sum, line) => sum + line.qty, 0)} منتجات</span>
      </header>
      {error && <p className="cart-error" role="alert">{error}</p>}

      <div className="cart-lines">
        {lines.map((line) => {
          const priceBusy = busyKey === `price-${line.id}`;
          const decreaseBusy = busyKey === `decrease-${line.id}`;
          const increaseBusy = busyKey === `increase-${line.id}`;
          const removeBusy = busyKey === `remove-${line.id}`;
          const controlsDisabled = mutating || busyKey !== null;

          return (
            <article className="cart-line" key={line.id}>
              <div className="cart-line__product">
                <div className="cart-line__image">
                  {line.image ? <img src={line.image} alt="" /> : <ShoppingBag size={21} aria-hidden="true" />}
                </div>
                <div className="cart-line__details">
                  <strong>{line.name}</strong>
                  <span>{money(line.price)} للقطعة</span>
                  {line.available === false && <small className="cart-line__unavailable">هذا المنتج غير متاح حالياً</small>}
                  {line.priceChanged && (
                    <div className="cart-price-change">
                      <small>السعر الحالي: {money(line.currentPrice ?? line.price)}</small>
                      <LoadingButton
                        type="button"
                        className="cart-price-change__button"
                        loading={priceBusy}
                        disabled={controlsDisabled && !priceBusy}
                        pendingText="جارٍ التحديث..."
                        onClick={() => void runAction(`price-${line.id}`, () => refresh(line.id))}
                      >
                        اعتماد السعر الجديد
                      </LoadingButton>
                    </div>
                  )}
                </div>
              </div>

              <div className="cart-line__controls">
                <div className="cart-quantity" aria-label={`الكمية: ${line.qty}`}>
                  <LoadingButton
                    type="button"
                    className="cart-quantity__button"
                    loading={decreaseBusy}
                    disabled={controlsDisabled && !decreaseBusy}
                    pendingText="..."
                    aria-label="تقليل الكمية"
                    onClick={() => void runAction(`decrease-${line.id}`, () => set(line.id, line.qty - 1))}
                  >
                    <Minus size={15} aria-hidden="true" />
                  </LoadingButton>
                  <span>{line.qty}</span>
                  <LoadingButton
                    type="button"
                    className="cart-quantity__button"
                    loading={increaseBusy}
                    disabled={(controlsDisabled && !increaseBusy) || line.available === false || line.qty >= (line.stock ?? 99)}
                    pendingText="..."
                    aria-label="زيادة الكمية"
                    onClick={() => void runAction(`increase-${line.id}`, () => set(line.id, line.qty + 1))}
                  >
                    <Plus size={15} aria-hidden="true" />
                  </LoadingButton>
                </div>
                <strong className="cart-line__subtotal">{money(line.price * line.qty)}</strong>
                <LoadingButton
                  type="button"
                  className="cart-line__remove"
                  loading={removeBusy}
                  disabled={controlsDisabled && !removeBusy}
                  pendingText="..."
                  aria-label={`حذف ${line.name} من السلة`}
                  onClick={() => void runAction(`remove-${line.id}`, () => set(line.id, 0))}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </LoadingButton>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="cart-summary">
        <div className="cart-summary__total"><span>المجموع</span><strong>{money(total)}</strong></div>
        <Link className="cart-checkout" href="/ar/checkout">متابعة إلى الدفع <ArrowLeft size={17} aria-hidden="true" /></Link>
      </footer>
    </section>
  );
}
