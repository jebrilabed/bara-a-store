import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import LoadingButton from "@/components/ui/LoadingButton";
import { requireAdmin } from "@/lib/auth/authorization";
import { InputError, parseProductInput } from "@/lib/backend-policy.mjs";
import { writeAdminAudit } from "@/lib/admin/audit";
import { uploadProductImage } from "@/lib/cloudinary";
import { revalidatePublicCatalog } from "@/lib/storefront/catalog";
import ProductImageField from "@/components/admin/ProductImageField";
import ProductFeaturesField from "@/components/admin/ProductFeaturesField";

export const dynamic = "force-dynamic";

async function updateProduct(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 100) throw new InputError("Invalid product");
  const input = parseProductInput(fd);
  const { categoryId } = input;
  const [existing, category] = await Promise.all([
    db.product.findUnique({ where: { id }, select: { id: true } }),
    db.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
  ]);
  if (!existing) throw new InputError("Product was not found");
  if (!category) throw new InputError("يرجى اختيار قسم صالح وموجود");
  const image = await uploadProductImage(fd.get("image"));

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        stock: input.stock,
        features: input.features,
        image: image ?? undefined,
        category: { connect: { id: categoryId } },
      },
    });
    await writeAdminAudit(tx, admin.id, "PRODUCT_UPDATED", "Product", id);
  });

  revalidatePath("/admin/products");
  revalidatePath("/ar");
  revalidatePath("/ar/products");
  revalidatePath("/api/products");
  revalidatePublicCatalog();
  redirect("/admin/products?toast=product-updated");
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: params.id } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <section style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/admin/products" className="btn o" aria-label="العودة إلى المنتجات">رجوع</Link>
        <div>
          <h2 style={{ margin: 0 }}>تعديل المنتج</h2>
          <p style={{ color: "var(--soft)", margin: 0 }}>{product.name}</p>
        </div>
      </div>

      <form action={updateProduct} encType="multipart/form-data" style={{ display: "flex", flexDirection: "column", gap: "18px", padding: "24px", background: "#fff", border: "1px solid #e6e8e4", borderRadius: "8px" }}>
        <input type="hidden" name="id" value={product.id} />

        <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
          اسم المنتج
          <input name="name" defaultValue={product.name} maxLength={160} required />
        </label>

        <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
          وصف المنتج
          <textarea name="description" defaultValue={product.description} rows={4} maxLength={5000} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            سعر البيع (₪)
            <input name="price" type="number" min="0" step="0.01" defaultValue={product.price.toString()} required />
          </label>
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            السعر قبل الخصم (₪)
            <input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={product.compareAtPrice?.toString() ?? ""} />
          </label>
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            الكمية في المخزون
            <input name="stock" type="number" min="0" step="1" defaultValue={product.stock} required />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px", fontWeight: 700, maxWidth: "360px" }}>
          القسم
          <select name="cat" defaultValue={product.categoryId} required>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>

        <ProductFeaturesField initialFeatures={product.features} />

        <ProductImageField initialImage={product.image} helpText="اتركي الحقل فارغًا للاحتفاظ بالصورة الحالية. JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت." />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "16px", borderTop: "1px solid #eceeea" }}>
          <Link href="/admin/products" className="btn o">إلغاء</Link>
          <LoadingButton type="submit" className="btn" pendingText="جارٍ حفظ التعديلات...">حفظ التعديلات</LoadingButton>
        </div>
      </form>
    </section>
  );
}