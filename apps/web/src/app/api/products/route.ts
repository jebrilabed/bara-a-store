import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicProduct } from "@/lib/storefront/public-product";
export const dynamic = "force-dynamic";
export async function GET() {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return NextResponse.json(products.map(publicProduct), { headers: { "Cache-Control": "public, max-age=30" } });
}
