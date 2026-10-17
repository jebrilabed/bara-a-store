import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { money } from "@/lib/settings";
import { Plus, Package, Pencil, Power } from "lucide-react";
import DeleteProductForm from "@/components/admin/DeleteProductForm";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";
const PRODUCTS_PER_PAGE = 10;

async function setProductActive(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid product");
  const activeValue = String(fd.get("active") ?? "");
  if (activeValue !== "true" && activeValue !== "false") throw new InputError("Invalid product status");
  const active = activeValue === "true";

  const result = await db.product.updateMany({ where: { id }, data: { active } });
  if (!result.count) throw new InputError("Product was not found");

  writeAdminAudit(db, admin.id, active ? "PRODUCT_ACTIVATED" : "PRODUCT_DEACTIVATED", "Product", id).catch((err) =>
    console.error("[admin-audit-error]", err)
  );

  revalidatePath("/admin/products");
  revalidatePath("/ar");
  revalidatePath("/ar/products");
  revalidatePath("/api/products");
  revalidatePublicCatalog();
  redirect(`/admin/products?toast=product-${active ? "activated" : "deactivated"}`);
}

async function deleteProduct(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid product");

  // Single batch operation to clean cart items and delete product
  await db.$transaction([
    db.cartItem.deleteMany({ where: { productId: id } }),
    db.product.delete({ where: { id } }),
  ]);

  writeAdminAudit(db, admin.id, "PRODUCT_DELETED", "Product", id).catch((err) =>
    console.error("[admin-audit-error]", err)
  );

  revalidatePath("/admin/products");
  revalidatePath("/ar");
  revalidatePath("/ar/products");
  revalidatePath("/api/products");
  revalidatePublicCatalog();
  redirect("/admin/products?toast=product-deleted");
}

export default async function ProductsPage({ searchParams }: { searchParams?: { status?: string; page?: string } }) {
  const requestedPage = Number(searchParams?.page);
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [totalProducts, firstPageProducts] = await Promise.all([
    db.product.count(),
    db.product.findMany({
      select: {
        id: true,
        image: true,
        name: true,
        category: { select: { name: true } },
        price: true,
        compareAtPrice: true,
        stock: true,
        active: true,
      },
      orderBy: { id: "desc" },
      skip: (safePage - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(safePage, totalPages);
  const products = currentPage === safePage
    ? firstPageProducts
    : await db.product.findMany({
        select: {
          id: true,
          image: true,
          name: true,
          category: { select: { name: true } },
          price: true,
          compareAtPrice: true,
          stock: true,
          active: true,
        },
        orderBy: { id: "desc" },
        skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
      });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
            إدارة المنتجات
          </h2>
          <p style={{ color: "var(--soft)", margin: 0, fontSize: "0.95rem" }}>
            عرض، تعديل، وإضافة منتجات المتجر
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            borderRadius: "16px",
            fontSize: "0.95rem",
            boxShadow: "0 4px 16px rgba(201, 114, 123, 0.3)",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>إضافة منتج جديد</span>
        </Link>
      </div>

      {searchParams?.status === "created" && (
        <div
          role="status"
          style={{
            background: "#EFFBF2",
            border: "1px solid #C4EED0",
            color: "#1B7B3A",
            padding: "12px 20px",
            borderRadius: "14px",
            fontWeight: 700,
          }}
        >
          ✓ تم إنشاء المنتج الجديد بنجاح وإضافته إلى المتجر!
        </div>
      )}
      {searchParams?.status === "updated" && (
        <div
          role="status"
          style={{
            background: "#EFFBF2",
            border: "1px solid #C4EED0",
            color: "#1B7B3A",
            padding: "12px 20px",
            borderRadius: "8px",
            fontWeight: 700,
          }}
        >
          تم تحديث بيانات المنتج بنجاح.
        </div>
      )}

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
          <div style={{ padding: "16px", background: "var(--mist)", borderRadius: "50%", color: "var(--rose-d)", display: "flex" }}>
            <Package size={44} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
            لا توجد منتجات مسجلة حالياً
          </h3>
          <p style={{ color: "var(--soft)", maxWidth: "400px", margin: 0 }}>
            ابدأي بإضافة أول منتج لمتجركِ ليظهر للزبائن في الصفحة الرئيسية والأقسام.
          </p>
          <Link
            href="/admin/products/new"
            className="btn"
            style={{
              marginTop: "8px",
              borderRadius: "14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Plus size={16} />
            <span>إضافة أول منتج الآن</span>
          </Link>
        </div>
      ) : (
        <>
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid var(--line)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الصورة</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>اسم المنتج</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>القسم</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>السعر</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>المخزون</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الحالة</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <img
                        src={product.image || "/logo.png"}
                        alt={product.name}
                        style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", background: "var(--mist)", display: "block" }}
                      />
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 800 }}>{product.name}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 700 }}>{product.category.name}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 800, color: "var(--rose-d)" }}>
                        {money(product.price)}
                      </div>
                      {(product as any).compareAtPrice && Number((product as any).compareAtPrice) > Number(product.price) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--soft)", textDecoration: "line-through" }}>
                          {money((product as any).compareAtPrice)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          background: product.stock <= 5 ? "#FEE2E2" : "#F3F4F6",
                          color: product.stock <= 5 ? "#B91C1C" : "var(--ink)",
                        }}
                      >
                        {product.stock} قطعة
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`product-status${product.active ? " is-active" : " is-inactive"}`}>
                        {product.active ? "مفعّل" : "موقوف"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div className="product-actions">
                        <Link
                          href={`/admin/products/${encodeURIComponent(product.id)}/edit`}
                          className="product-action product-action--edit"
                        >
                          <Pencil size={14} />
                          <span>تعديل</span>
                        </Link>
                        <form action={setProductActive}>
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="active" value={String(!product.active)} />
                          <LoadingButton type="submit" className={`product-action${product.active ? " product-action--pause" : " product-action--activate"}`} pendingText="جارٍ...">
                            <Power size={14} />
                            <span>{product.active ? "إيقاف" : "تفعيل"}</span>
                          </LoadingButton>
                        </form>
                        <DeleteProductForm id={product.id} action={deleteProduct} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <nav aria-label="صفحات المنتجات" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          {currentPage > 1 ? (
            <Link href={`/admin/products?page=${currentPage - 1}`} className="btn o">السابق</Link>
          ) : (
            <button type="button" className="btn o" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>السابق</button>
          )}
          <span style={{ color: "var(--soft)", fontWeight: 700 }}>الصفحة {currentPage} من {totalPages}</span>
          {currentPage < totalPages ? (
            <Link href={`/admin/products?page=${currentPage + 1}`} className="btn">التالي</Link>
          ) : (
            <button type="button" className="btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>التالي</button>
          )}
        </nav>
        </>
      )}
    </div>
  );
}
