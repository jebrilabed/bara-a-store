import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { Plus, Tags, Pencil } from "lucide-react";
import DeleteCategoryForm from "@/components/admin/DeleteCategoryForm";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

async function deleteCategory(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid category");

  try {
    const deleted = await db.category.delete({ where: { id } });
    writeAdminAudit(db, admin.id, "CATEGORY_DELETED", "Category", id, {
      name: deleted.name,
      slug: deleted.slug,
    }).catch((err) => console.error("[admin-audit-error]", err));
  } catch (error: any) {
    if (error?.code === "P2003" || error?.message?.includes("Foreign key")) {
      throw new InputError("لا يمكن حذف قسم مرتبط بمنتجات");
    }
    if (error?.code === "P2025") {
      throw new InputError("Category was not found");
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  revalidatePath("/ar");
  revalidatePath("/ar/categories");
  revalidatePublicCatalog();
  redirect("/admin/categories?toast=category-deleted");
}

export default async function CategoriesPage({ searchParams }: { searchParams?: { status?: string } }) {
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--rose-d)", margin: "0 0 6px" }}>
            أقسام المتجر
          </h2>
          <p style={{ color: "var(--soft)", margin: 0, fontSize: "0.95rem" }}>
            تصنيف المنتجات وتسهيل التصفح للزبائن
          </p>
        </div>
        <Link
          href="/admin/categories/new"
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
          <span>إضافة تصنيف جديد</span>
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
          ✓ تم إنشاء التصنيف الجديد بنجاح!
        </div>
      )}
      {searchParams?.status === "updated" && (
        <div role="status" style={{ background: "#EFFBF2", border: "1px solid #C4EED0", color: "#1B7B3A", padding: "12px 20px", borderRadius: "8px", fontWeight: 700 }}>
          تم تحديث بيانات القسم بنجاح.
        </div>
      )}

      {categories.length === 0 ? (
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
            <Tags size={44} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--rose-d)", margin: 0 }}>
            لا توجد أقسام مسجلة حتى الآن
          </h3>
          <p style={{ color: "var(--soft)", maxWidth: "400px", margin: 0 }}>
            أضيفي أول قسم لمتجركِ لتتمكني من إضافة المنتجات تحته وترتيبها.
          </p>
          <Link
            href="/admin/categories/new"
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
            <span>إضافة أول تصنيف</span>
          </Link>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid var(--line)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mist)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>عنوان التصنيف</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الوصف</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>عدد المنتجات</th>
                  <th style={{ padding: "14px 18px", fontWeight: 800, color: "var(--rose-d)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 800 }}>{c.name}</td>
                    <td style={{ padding: "14px 18px", color: "var(--soft)", fontSize: "0.9rem", maxWidth: "280px" }}>
                      {(c as any).description || "—"}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          background: "var(--mist)",
                          color: "var(--rose-d)",
                        }}
                      >
                        {c._count.products} منتج
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div className="category-actions">
                        <Link href={`/admin/categories/${encodeURIComponent(c.id)}/edit`} className="product-action product-action--edit">
                          <Pencil size={14} />
                          <span>تعديل</span>
                        </Link>
                        <DeleteCategoryForm id={c.id} action={deleteCategory} disabled={c._count.products > 0} />
                        {c._count.products > 0 && (
                          <small className="category-delete-hint">لا يمكن حذفه لارتباطه بمنتجات</small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
