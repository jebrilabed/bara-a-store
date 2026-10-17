"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import LoadingButton from "@/components/ui/LoadingButton";
import styles from "./AddToCart.module.css";

type AddToCartProps = {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  quantitySelector?: boolean;
};

export default function AddToCart({ id, name, price, stock, quantitySelector = false }: AddToCartProps) {
  const { add, mutating } = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const maxQuantity = Math.max(1, Math.min(99, stock));
  const parsedQuantity = Number(quantity);
  const validQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= maxQuantity
    ? parsedQuantity
    : null;

  async function addItem() {
    if (validQuantity === null) return;
    setBusy(true); setMessage("");
    try { await add({ id, name, price: Number(price), stock, quantity: quantitySelector ? validQuantity : 1 }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الإضافة"); }
    finally { setBusy(false); }
  }

  const button = <LoadingButton type="button" className="btn" disabled={stock < 1 || (mutating && !busy) || (quantitySelector && validQuantity === null)} loading={busy} pendingText="جارٍ الإضافة..." onClick={addItem}>{stock < 1 ? "نفد المخزون" : "أضيفي للسلة"}</LoadingButton>;

  return <>
    {quantitySelector ? (
      <div className={styles.controls}>
        <label className={styles.quantity}>
          الكمية
          <input
            className={styles.quantityInput}
            type="number"
            min={1}
            max={maxQuantity}
            step={1}
            value={quantity}
            disabled={stock < 1}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={() => setQuantity(String(validQuantity ?? 1))}
          />
        </label>
        {button}
      </div>
    ) : button}
    {message && <small className={styles.message} role="alert">{message}</small>}
  </>;
}
