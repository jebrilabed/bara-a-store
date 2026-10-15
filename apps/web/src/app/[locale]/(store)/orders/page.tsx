import { auth } from "@/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function O() {
  const s: any = await auth(); if (!s) return <h2>تم استلام طلبك. سنتواصل معك قريباً. سجّلي الدخول لمتابعة طلباتك.</h2>;
  const os = await db.order.findMany({ where: { userId: s.user.id }, orderBy: { createdAt: "desc" } });
  return <><h2>طلباتي</h2><table><tbody>{os.map(o => <tr key={o.id}><td>{o.createdAt.toLocaleDateString("ar")}</td><td>{money(o.total)}</td><td>{o.status}</td></tr>)}</tbody></table></>;
}
