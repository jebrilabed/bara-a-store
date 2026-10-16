import { notFound } from "next/navigation";
import Link from "next/link";
import { getStorefrontCategoryPage } from "@/lib/storefront/catalog";
import ProductCard from "@/components/storefront/ProductCard";
export const dynamic = "force-dynamic";
export default async function C({ params, searchParams }: any) {
  const requestedPage = Number(searchParams?.page);
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const firstPage = await getStorefrontCategoryPage(params.slug, safePage);
  if (!firstPage) notFound();
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize));
  const currentPage = Math.min(safePage, totalPages);
  const category = currentPage === safePage ? firstPage : await getStorefrontCategoryPage(params.slug, currentPage);

  return (
    <>
      <h2>{category!.name}</h2>
      <div className="grid">{category!.products.map((product) => <ProductCard key={product.id} p={product} />)}</div>
      {totalPages > 1 && (
        <nav className="row" aria-label="صفحات القسم">
          {currentPage > 1 && <Link className="btn o" href={`/ar/categories/${params.slug}?page=${currentPage - 1}`}>السابق</Link>}
          <span>صفحة {currentPage} من {totalPages}</span>
          {currentPage < totalPages && <Link className="btn" href={`/ar/categories/${params.slug}?page=${currentPage + 1}`}>التالي</Link>}
        </nav>
      )}
    </>
  );
}
