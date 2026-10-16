"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import LoadingButton from "@/components/ui/LoadingButton";
export default function AddToCart({ id, name, price, stock }: any) {
  const { add, mutating } = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function addItem() {
    setBusy(true); setMessage("");
    try { await add({ id, name, price: Number(price), stock }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الإضافة"); }
    finally { setBusy(false); }
  }
  return <><LoadingButton type="button" className="btn" disabled={stock < 1 || (mutating && !busy)} loading={busy} pendingText="جارٍ الإضافة..." onClick={addItem}>{stock < 1 ? "نفد المخزون" : "أضيفي للسلة"}</LoadingButton>{message && <small role="alert">{message}</small>}</>;
}
