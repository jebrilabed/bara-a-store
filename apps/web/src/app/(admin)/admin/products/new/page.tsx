import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import type { ProductType } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, parseProductInput } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { uploadProductImage } from "@/lib/cloudinary";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";
import ProductImageField from "@/components/admin/ProductImageField";
import ProductFeaturesField from "@/components/admin/ProductFeaturesField";

export const dynamic = "force-dynamic";

async function createProduct(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const input = parseProductInput(fd);

  // Run category verification and image upload concurrently
  const [category, image] = await Promise.all([
    db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    uploadProductImage(fd.get("image")),
  ]);
  if (!category) throw new InputError("يرجى اختيار قسم صالح وموجود");

  const suffix = randomBytes(4).toString("hex");
  const { categoryId, ...productInput } = input;

  const created = await db.product.create({
    data: {
      ...productInput,
      type: productInput.type as ProductType,
      image: image ?? productInput.image,
      slug: `${input.slug || "product"}-${suffix}`,
      skuCode: productInput.skuCode ?? `BS-${randomBytes(6).toString("hex").toUpperCase()}`,
      category: { connect: { id: categoryId } },
    },
  });

  writeAdminAudit(db, admin.id, "PRODUCT_CREATED", "Product", created.id, {
    type: created.type,
    skuCode: created.skuCode,
    price: created.price.toString(),
  }).catch((err) => console.error("[admin-audit-error]", err));

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/ar");
  revalidatePath("/ar/products");
  revalidatePublicCatalog();
  redirect("/admin/products?toast=product-created");
}

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div style={{ maxWidth: "800px", margin: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/admin/products"
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
          <span>العودة للمنتجات</span>
        </Link>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--rose-d)", margin: 0 }}>
            إضافة منتج جديد
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
        <form action={createProduct} encType="multipart/form-data" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Product Name */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>اسم المنتج <span style={{ color: "crimson" }}>*</span></span>
            <input
              name="name"
              placeholder="مثال: غسول الوجه اللطيف بخلاصة الورد"
              maxLength={160}
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
            />
          </label>

          {/* Description */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>وصف المنتج</span>
            <textarea
              name="description"
              placeholder="اكتبي وصفاً جذاباً وتفصيلياً للمنتج ومميزاته..."
              rows={4}
              maxLength={5000}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
            />
          </label>

          {/* Pricing Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>سعر البيع (₪) <span style={{ color: "crimson" }}>*</span></span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="مثال: 45.00"
                required
                style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>السعر قبل الخصم (اختياري) (₪)</span>
              <input
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="مثال: 60.00"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
              />
              <small style={{ color: "var(--soft)", fontSize: "0.8rem" }}>يظهر مشطوباً لإبراز نسبة الخصم للزبون</small>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>الكمية في المخزون <span style={{ color: "crimson" }}>*</span></span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue="20"
                required
                style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
              />
            </label>
          </div>

          {/* Category */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>التصنيف / القسم <span style={{ color: "crimson" }}>*</span></span>
              <select
                name="cat"
                required
                defaultValue=""
                style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid var(--line)" }}
              >
                <option value="" disabled>اختاري القسم</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <ProductFeaturesField />

          <ProductImageField helpText="ارفعي صورة بصيغة JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت." />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px", paddingTop: "18px", borderTop: "1px solid var(--line)" }}>
            <Link
              href="/admin/products"
              className="btn o"
              style={{ padding: "12px 24px", borderRadius: "14px" }}
            >
              إلغاء
            </Link>
            <LoadingButton
              type="submit"
              className="btn"
              pendingText="جارٍ نشر المنتج..."
              style={{ padding: "12px 36px", borderRadius: "14px", fontSize: "1rem" }}
            >
              حفظ ونشر المنتج
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
