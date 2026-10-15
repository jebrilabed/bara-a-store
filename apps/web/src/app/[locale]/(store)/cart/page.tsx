"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/settings";
export default function Cart() {
  const { lines, set, refresh, total, error } = useCart();
  if (!lines.length) return <h2>سلتك فارغة. أضيفي منتجاً من المتجر.</h2>;
  return (<><h2>سلة التسوق</h2>{error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}<table><tbody>{lines.map((l: any) => <tr key={l.id}><td>{l.name}{l.available === false && <small> · غير متاح حالياً</small>}{l.priceChanged && <div><small>السعر الحالي: {money(l.currentPrice ?? l.price)}</small> <button onClick={() => void refresh(l.id).catch(() => {})}>اعتماد السعر الجديد</button></div>}</td><td>{money(l.price)}</td><td><button onClick={() => void set(l.id, l.qty - 1).catch(() => {})}>−</button> {l.qty} <button disabled={l.available === false || l.qty >= (l.stock ?? 99)} onClick={() => void set(l.id, l.qty + 1).catch(() => {})}>+</button></td></tr>)}</tbody></table>
    <div className="row"><b>المجموع: {money(total)}</b><Link className="btn" href="/ar/checkout">إتمام الطلب</Link></div></>);
}
