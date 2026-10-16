import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, makeSlug } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

async function createCategory(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();

  if (!name || name.length > 120) {
    throw new InputError("يرجى إدخال عنوان صالح للتصنيف");
  }

  // Generate a URL-friendly slug from name with unique fallback
  let slug = makeSlug(name);
  if (!slug) {
    slug = `cat-${Date.now()}`;
  }

  // Check if slug already exists, if so append unique timestamp
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const category = await db.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        name,
        slug,
        description,
      } as any,
    });
    await writeAdminAudit(tx, admin.id, "CATEGORY_CREATED", "Category", created.id, {
      name,
      slug,
    });
    return created;
  });

  revalidatePath("/admin/categories");
  revalidatePath("/ar");
  revalidatePath("/ar/categories");
  revalidatePublicCatalog();
  redirect("/admin/categories?toast=category-created");
}

export default function NewCategoryPage() {
  return (
    <div style={{ maxWidth: "600px", margin: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/admin/categories"
          style={{
            background: "var(--mist)",
            color: "var(--rose-d)",
            padding: "8px 14px",
            borderRadius: "12px",
            fontWeight: 800,
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>→</span>
          <span>العودة للأقسام</span>
        </Link>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--rose-d)", margin: 0 }}>
            إضافة تصنيف جديد
          </h2>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          border: "1px solid var(--line)",
          padding: "32px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        <form action={createCategory} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Category Title / Name */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>عنوان التصنيف <span style={{ color: "crimson" }}>*</span></span>
            <input
              name="name"
              placeholder="مثال: العناية بالبشرة"
              maxLength={120}
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
            />
          </label>

          {/* Category Description */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>وصف التصنيف</span>
            <textarea
              name="description"
              placeholder="اكتبي وصفاً مختصراً لمنتجات هذا القسم ومحتوياته..."
              rows={4}
              maxLength={1000}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px", paddingTop: "18px", borderTop: "1px solid var(--line)" }}>
            <Link
              href="/admin/categories"
              className="btn o"
              style={{ padding: "12px 24px", borderRadius: "14px" }}
            >
              إلغاء
            </Link>
            <LoadingButton
              type="submit"
              className="btn"
              pendingText="جارٍ إضافة القسم..."
              style={{ padding: "12px 36px", borderRadius: "14px", fontSize: "1rem" }}
            >
              إضافة التصنيف
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
