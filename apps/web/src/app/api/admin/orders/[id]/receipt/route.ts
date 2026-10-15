import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrivateReceiptUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: params.id },
    select: { receiptPublicId: true, receiptResourceType: true, receiptFormat: true },
  });
  if (!order?.receiptPublicId || !order.receiptResourceType || !order.receiptFormat) {
    return new NextResponse("Receipt not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const url = getPrivateReceiptUrl({
    publicId: order.receiptPublicId,
    resourceType: order.receiptResourceType as "image" | "raw",
    format: order.receiptFormat,
  });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}