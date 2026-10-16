import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, makeSlug } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

async function updateCategory(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  if (!id || id.length > 100) throw new InputError("Invalid category");
  if (!name || name.length > 120) throw new InputError("يرجى إدخال عنوان صالح للقسم");
  if (description.length > 1000) throw new InputError("وصف القسم طويل جدًا");

  const category = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!category) throw new InputError("Category was not found");

  const baseSlug = makeSlug(name) || `cat-${randomBytes(4).toString("hex")}`;
  const collision = await db.category.findFirst({
    where: { slug: baseSlug, id: { not: id } },
    select: { id: true },
  });
  const slug = collision ? `${baseSlug}-${randomBytes(2).toString("hex")}` : baseSlug;

  await db.$transaction(async (tx) => {
    const updated = await tx.category.update({ where: { id }, data: { name, description, slug } });
    await writeAdminAudit(tx, admin.id, "CATEGORY_UPDATED", "Category", id, { name, slug });
    return updated;
  });

  revalidatePath("/admin/categories");
  revalidatePath("/ar");
  revalidatePath("/ar/categories");
  revalidatePublicCatalog();
  redirect("/admin/categories?toast=category-updated");
}

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const category = await db.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

  return (
    <section style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/admin/categories" className="btn o">رجوع</Link>
        <div>
          <h2 style={{ margin: 0 }}>تعديل القسم</h2>
          <p style={{ color: "var(--soft)", margin: 0 }}>{category.name}</p>
        </div>
      </div>

      <form action={updateCategory} style={{ display: "flex", flexDirection: "column", gap: "18px", padding: "24px", background: "#fff", border: "1px solid #e6e8e4", borderRadius: "8px" }}>
        <input type="hidden" name="id" value={category.id} />
        <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
          اسم القسم
          <input name="name" defaultValue={category.name} maxLength={120} required />
        </label>
        <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
          وصف القسم
          <textarea name="description" defaultValue={category.description ?? ""} rows={4} maxLength={1000} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "16px", borderTop: "1px solid #eceeea" }}>
          <Link href="/admin/categories" className="btn o">إلغاء</Link>
          <LoadingButton type="submit" className="btn" pendingText="جارٍ حفظ التعديلات...">حفظ التعديلات</LoadingButton>
        </div>
      </form>
    </section>
  );
}