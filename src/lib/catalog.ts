import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchCatalogClient } from "./api-client";
import { IS_NATIVE_BUILD } from "./api-base";
import { FALLBACK_CATALOG, type CatalogProduct } from "./catalog-meta";

export const catalogQueryOptions = queryOptions({
  queryKey: ["wix-catalog"],
  queryFn: () => fetchCatalogClient(),
  // Native must never serve a stale/bundled catalog as if it were current.
  staleTime: IS_NATIVE_BUILD ? 0 : 5 * 60 * 1000,
  gcTime: IS_NATIVE_BUILD ? 60 * 1000 : 5 * 60 * 1000,
  refetchOnMount: IS_NATIVE_BUILD ? "always" : true,
  refetchOnWindowFocus: IS_NATIVE_BUILD,
  retry: IS_NATIVE_BUILD ? 2 : 1,
});

export function useCatalog(): {
  products: CatalogProduct[];
  isLive: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery(catalogQueryOptions);

  // Refresh whenever the app comes back to the foreground (native) or the tab
  // becomes visible again, so newly published Wix products show up instantly.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    let cleanupNative: (() => void) | undefined;
    if (IS_NATIVE_BUILD) {
      void import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) void refetch();
          }),
        )
        .then((handle) => {
          cleanupNative = () => void handle.remove();
        })
        .catch(() => {});
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      cleanupNative?.();
    };
  }, [refetch]);

  const live = data as CatalogProduct[] | undefined;

  return {
    // Native: never substitute the bundled snapshot — surface the error instead.
    products: live ?? (IS_NATIVE_BUILD ? [] : FALLBACK_CATALOG),
    isLive: !!live,
    isLoading,
    isFetching,
    isError: IS_NATIVE_BUILD ? isError && !live : isError,
    error: (error as Error | null) ?? null,
    refetch: () => void refetch(),
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
