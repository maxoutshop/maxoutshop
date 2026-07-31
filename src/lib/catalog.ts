import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCatalog } from "./wix.functions";
import { FALLBACK_CATALOG, type CatalogProduct } from "./catalog-meta";

export const catalogQueryOptions = queryOptions({
  queryKey: ["wix-catalog"],
  queryFn: () => getCatalog(),
  staleTime: 5 * 60 * 1000,
});

export function useCatalog(): { products: CatalogProduct[]; isLive: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery(catalogQueryOptions);
  return {
    products: (data as CatalogProduct[] | undefined) ?? FALLBACK_CATALOG,
    isLive: !!data,
    isLoading,
  };
}

export function findVariant(product: CatalogProduct | undefined, size?: string, color?: string) {
  if (!product?.variants?.length) return undefined;
  const match = product.variants.find((v) => {
    const c = v.choices ?? {};
    const vSize = c["Size"] ?? c["size"];
    const vColor = c["Color"] ?? c["Colour"] ?? c["color"];
    return (!vSize || !size || vSize === size) && (!vColor || !color || vColor === color);
  });
  return match ?? product.variants[0];
}

export function relatedFrom(list: CatalogProduct[], slug: string, n = 4) {
  const p = list.find((x) => x.slug === slug);
  if (!p) return [];
  return list
    .filter((x) => x.slug !== slug && (x.collection === p.collection || x.category === p.category))
    .slice(0, n);
}
