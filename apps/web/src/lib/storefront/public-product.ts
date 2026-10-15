export function publicProduct<T extends { price: { toString(): string }; compareAtPrice?: { toString(): string } | null }>(product: T) {
  return {
    ...product,
    price: Number(product.price.toString()),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice.toString()) : null,
  };
}
