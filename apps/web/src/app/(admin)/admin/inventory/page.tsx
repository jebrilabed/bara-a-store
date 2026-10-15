import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { ClipboardList, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

async function updateInventory(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const stockText = String(fd.get("stock") ?? "");
  if (!id || id.length > 100 || !/^\d{1,10}$/.test(stockText) || Number(stockText) > 1_000_000_000) {
    throw new InputError("يرجى إدخال كمية مخزون صالحة");
  }
  const stock = Number(stockText);
  await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id }, select: { stock: true } });
    if (!product) throw new InputError("Product was not found");
    const result = await tx.product.updateMany({ where: { id, stock: product.stock }, data: { stock } });
    if (!result.count) throw new InputError("Stock changed. Refresh and try again", 409);
    await writeAdminAudit(tx, admin.id, "INVENTORY_ADJUSTED", "Product", id, {
      before: product.stock,
      after: stock,
    });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/ar/products");
}

export default async function InventoryPage() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { stock: "asc" },
    select: { id: true, name: true, stock: true, skuCode: true, image: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
          إدارة المخزون
        </h2>
        <p style={{ color: "var(--soft)", margin: 0, fontSize: "0.95rem" }}>
          مراقبة كميات المنتجات وتحديث المخزون
        </p>
      </div>

      {products.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            border: "1px dashed var(--line)",
            padding: "60px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <ClipboardList size={56} strokeWidth={1.75} color="var(--rose-d)" aria-hidden="true" />
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
            لا توجد منتجات مسجلة في المخزون
          </h3>
          <p style={{ color: "var(--soft)", maxWidth: "400px", margin: 0 }}>
            عند إضافة منتجات للمتجر، ستتمكني من إدارة كمياتها ومراقبة المنتجات التي أوشكت على النفاد هنا.
          </p>
          <Link href="/admin/products/new" className="btn" style={{ marginTop: "8px", borderRadius: "14px" }}>
            + إضافة منتج جديد
          </Link>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid var(--line)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "start" }}>
              <thead>
                <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>المنتج</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الكمية الحالية</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الحالة</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>تعديل الكمية</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isOutOfStock = product.stock === 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <tr key={product.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            src={product.image || "/logo.png"}
                            alt={product.name}
                            style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", background: "var(--mist)" }}
                          />
                          <div>
                            <div style={{ fontWeight: 800 }}>{product.name}</div>
                            {product.skuCode && (
                              <div style={{ fontSize: "0.75rem", color: "var(--soft)", fontFamily: "monospace" }}>
                                {product.skuCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 800, fontSize: "1.05rem" }}>
                        {product.stock} قطعة
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {isOutOfStock ? (
                          <span style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, background: "#FEE2E2", color: "#B91C1C" }}>
                            نفد من المخزون
                          </span>
                        ) : isLowStock ? (
                          <span style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, background: "#FEF3C7", color: "#B45309" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <TriangleAlert size={14} aria-hidden="true" />
                              مخزون منخفض
                            </span>
                          </span>
                        ) : (
                          <span style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, background: "#DCFCE7", color: "#15803D" }}>
                            متوفر
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <form action={updateInventory} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <input type="hidden" name="id" value={product.id} />
                          <input
                            name="stock"
                            type="number"
                            min="0"
                            max="1000000000"
                            step="1"
                            defaultValue={product.stock}
                            style={{ width: "90px", padding: "6px 10px", borderRadius: "10px" }}
                          />
                          <button
                            type="submit"
                            className="btn"
                            style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "10px" }}
                          >
                            تحديث
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
