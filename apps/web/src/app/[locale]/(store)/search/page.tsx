import SearchForm from "./SearchForm";

import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";
import { getStorefrontSearchPage } from "@/lib/storefront/catalog";
export const dynamic = "force-dynamic";
export default async function S({ searchParams }: any) {
  const q = String(searchParams.q || "").trim().slice(0, 120);
  const requestedPage = Number(searchParams.page);
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const results = q ? await getStorefrontSearchPage(q, safePage) : { total: 0, products: [], pageSize: 24 };
  const totalPages = Math.max(1, Math.ceil(results.total / results.pageSize));
  const currentPage = Math.min(safePage, totalPages);
  const pageResults = q && currentPage !== safePage ? await getStorefrontSearchPage(q, currentPage) : results;

  return (
    <>
      <SearchForm query={q} />
      {q && results.total === 0 && <p role="status">لا توجد منتجات مطابقة.</p>}
      <div className="grid">{pageResults.products.map((product) => <ProductCard key={product.id} p={product} />)}</div>
      {totalPages > 1 && (
        <nav className="row" aria-label="صفحات نتائج البحث">
          {currentPage > 1 && <Link className="btn o" href={`/ar/search?q=${encodeURIComponent(q)}&page=${currentPage - 1}`}>السابق</Link>}
          <span>صفحة {currentPage} من {totalPages}</span>
          {currentPage < totalPages && <Link className="btn" href={`/ar/search?q=${encodeURIComponent(q)}&page=${currentPage + 1}`}>التالي</Link>}
        </nav>
      )}
    </>
  );
}
