"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
export default function AddToCart({ id, name, price, stock }: any) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function addItem() {
    setBusy(true); setMessage("");
    try { await add({ id }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الإضافة"); }
    finally { setBusy(false); }
  }
  return <><button className="btn" disabled={stock < 1 || busy} onClick={addItem}>{stock < 1 ? "نفد المخزون" : busy ? "جارٍ الإضافة" : "أضيفي للسلة"}</button>{message && <small role="alert">{message}</small>}</>;
}
