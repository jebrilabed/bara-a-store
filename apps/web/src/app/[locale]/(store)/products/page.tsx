import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";
import { getStorefrontProductPage } from "@/lib/storefront/catalog";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams?: { page?: string } }) {
	const requestedPage = Number(searchParams?.page);
	const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const firstPage = await getStorefrontProductPage(safePage);
	const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize));
	const currentPage = Math.min(safePage, totalPages);
	const products = currentPage === safePage ? firstPage.products : (await getStorefrontProductPage(currentPage)).products;

	return (
		<>
			<h2>كل المنتجات</h2>
			<div className="grid">{products.map((product) => <ProductCard key={product.id} p={product} />)}</div>
			{totalPages > 1 && (
				<nav className="row" aria-label="صفحات المنتجات">
					{currentPage > 1 && <Link className="btn o" href={`/ar/products?page=${currentPage - 1}`}>السابق</Link>}
					<span>صفحة {currentPage} من {totalPages}</span>
					{currentPage < totalPages && <Link className="btn" href={`/ar/products?page=${currentPage + 1}`}>التالي</Link>}
				</nav>
			)}
		</>
	);
}
