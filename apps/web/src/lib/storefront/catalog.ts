import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PUBLIC_CATALOG_TAG = "public-catalog";
const CACHE_SECONDS = 300;
const cacheOptions = { revalidate: CACHE_SECONDS, tags: [PUBLIC_CATALOG_TAG] };

const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  image: true,
} satisfies Prisma.ProductSelect;

function productCard(product: {
  id: string;
  slug: string;
  name: string;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  stock: number;
  image: string | null;
}) {
  return {
    ...product,
    price: Number(product.price.toString()),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice.toString()) : null,
  };
}

export const getStorefrontHomeData = unstable_cache(async () => {
  const [categories, products] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.product.findMany({
      where: { active: true },
      take: 8,
      orderBy: { id: "desc" },
      select: productCardSelect,
    }),
  ]);

  return { categories, products: products.map(productCard) };
}, ["storefront-home-v1"], cacheOptions);

export const getStorefrontProductPage = unstable_cache(async (page: number) => {
  const pageSize = 24;
  const [total, products] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect,
    }),
  ]);

  return { total, products: products.map(productCard), pageSize };
}, ["storefront-product-page-v1"], cacheOptions);

export const getStorefrontSearchPage = unstable_cache(async (query: string, page: number) => {
  const pageSize = 24;
  const where = { active: true, name: { contains: query, mode: "insensitive" as const } };
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect,
    }),
  ]);

  return { total, products: products.map(productCard), pageSize };
}, ["storefront-search-page-v1"], cacheOptions);

export const getStorefrontCategories = unstable_cache(
  () => db.category.findMany({ select: { id: true, name: true, slug: true } }),
  ["storefront-categories-v1"],
  cacheOptions,
);

export const getStorefrontCategoryPage = unstable_cache(async (slug: string, page: number) => {
  const pageSize = 24;
  const category = await db.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: productCardSelect,
      },
      _count: { select: { products: { where: { active: true } } } },
    },
  });

  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    total: category._count.products,
    pageSize,
    products: category.products.map(productCard),
  };
}, ["storefront-category-page-v1"], cacheOptions);

export const getStorefrontProduct = unstable_cache(async (slug: string) => {
  const product = await db.product.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      packageSize: true,
      ingredients: true,
      skinSuitability: true,
      scentProfile: true,
      usageInstructions: true,
      usageArea: true,
      safetyWarnings: true,
      storageInstructions: true,
      manufacturer: true,
      features: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      image: true,
      category: { select: { name: true } },
    },
  });

  return product
    ? {
        ...product,
        price: Number(product.price.toString()),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice.toString()) : null,
      }
    : null;
}, ["storefront-product-v1"], cacheOptions);

export function revalidatePublicCatalog() {
  revalidateTag(PUBLIC_CATALOG_TAG);
}