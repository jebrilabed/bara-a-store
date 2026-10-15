import { db } from "./db";
export async function getSetting(key: string, fallback = "") { return (await db.setting.findUnique({ where: { key } }))?.value ?? fallback; }
export const money = (n: number | string | { toString(): string }) => `${Number(n.toString()).toFixed(2)} ₪`;
