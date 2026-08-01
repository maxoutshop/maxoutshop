import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useCatalog } from "@/lib/catalog";
import { ProductTile, ProductTileSkeleton } from "@/components/ProductTile";
import { useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";

type ShopSearch = { category?: string; collection?: string; q?: string; sort?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
    collection: typeof s.collection === "string" ? s.collection : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop — MAXOUT" },
      { name: "description", content: "Shop the full MAXOUT collection — men, women, accessories, and the latest drop." },
      { property: "og:title", content: "Shop — MAXOUT" },
      { property: "og:description", content: "Shop the full MAXOUT collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

const CATS = [
  { key: undefined, label: "All" },
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "unisex", label: "Unisex" },
  { key: "accessories", label: "Accessories" },
] as const;

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "price-asc", label: "Price low → high" },
  { key: "price-desc", label: "Price high → low" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const MAX_PRICE = 100;

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(MAX_PRICE);
  const [onSale, setOnSale] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const { products, isLoading } = useCatalog();

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.category) list = list.filter((p) => p.category === search.category || (search.category !== "accessories" && p.category === "unisex"));
    if (search.collection) list = list.filter((p) => p.collection === search.collection);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.collection?.toLowerCase().includes(needle));
    }
    if (sizes.length) list = list.filter((p) => p.sizes.some((s) => sizes.includes(s)));
    if (onSale) list = list.filter((p) => !!p.salePrice);
    if (newOnly) list = list.filter((p) => !!p.newArrival);
    if (inStockOnly) list = list.filter((p) => p.inStock !== false);
    list = list.filter((p) => (p.salePrice ?? p.price) <= maxPrice);
    switch (search.sort) {
      case "price-asc": list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break;
      case "price-desc": list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break;
      case "new": list.sort((a, b) => Number(!!b.newArrival) - Number(!!a.newArrival)); break;
    }
    return list;
  }, [products, search, q, sizes, maxPrice, onSale, newOnly, inStockOnly]);

  const activeChips: { label: string; clear: () => void }[] = [
    ...(search.collection ? [{ label: search.collection, clear: () => navigate({ search: (p: ShopSearch) => ({ ...p, collection: undefined }) }) }] : []),
    ...sizes.map((s) => ({ label: `Size ${s}`, clear: () => setSizes((prev) => prev.filter((x) => x !== s)) })),
    ...(maxPrice < MAX_PRICE ? [{ label: `Under $${maxPrice}`, clear: () => setMaxPrice(MAX_PRICE) }] : []),
    ...(onSale ? [{ label: "On sale", clear: () => setOnSale(false) }] : []),
    ...(newOnly ? [{ label: "New arrivals", clear: () => setNewOnly(false) }] : []),
    ...(inStockOnly ? [{ label: "In stock", clear: () => setInStockOnly(false) }] : []),
  ];
  const activeCount = activeChips.length;

  const resetAll = () => {
    setSizes([]); setMaxPrice(MAX_PRICE); setQ(""); setOnSale(false); setNewOnly(false); setInStockOnly(false);
    navigate({ search: {} });
  };

  const sortLabel = SORTS.find((s) => s.key === (search.sort ?? "featured"))?.label ?? "Featured";

  return (
    <AppShell>
      <div className="pt-1">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="kicker text-muted-foreground">The store</p>
            <h1 className="display mt-1 text-5xl leading-[0.85]">Shop</h1>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {activeCount}
              </span>
            )}
          </button>
        </header>

        <div className="sticky top-0 z-30 -mx-4 mt-4 bg-background/85 px-4 pb-2 pt-2 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, collections"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search" className="shrink-0 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="no-scrollbar mt-2 flex snap-x gap-2 overflow-x-auto">
            {CATS.map((c) => {
              const active = search.category === c.key;
              return (
                <button
                  key={c.label}
                  onClick={() => navigate({ search: (prev: ShopSearch) => ({ ...prev, category: c.key }) })}
                  className={`shrink-0 snap-start rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] transition ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="kicker text-muted-foreground">
            {isLoading ? "Loading" : `${filtered.length} products`}
          </span>
          <button
            onClick={() => setShowFilters(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortLabel}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.clear}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium"
              >
                {chip.label}
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
            <button onClick={resetAll} className="shrink-0 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground underline">
              Clear
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductTileSkeleton key={i} wide={i === 0} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center">
            <h2 className="display text-3xl leading-none">Nothing here</h2>
            <p className="mt-2 text-sm text-muted-foreground">No products match your filters.</p>
            <button onClick={resetAll} className="mt-5 rounded-full bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground">
              Reset everything
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {filtered.map((p, i) => (
              <ProductTile key={p.slug} product={p} index={i} wide={i % 5 === 0} />
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="display text-2xl leading-none">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary" aria-label="Close filters">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <p className="kicker text-muted-foreground">Sort</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SORTS.map((s) => {
                  const active = (search.sort ?? "featured") === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => navigate({ search: (prev: ShopSearch) => ({ ...prev, sort: s.key }) })}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium ${active ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="kicker text-muted-foreground">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
                      sizes.includes(s) ? "border-accent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="kicker text-muted-foreground">Show only</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "On sale", on: onSale, toggle: () => setOnSale((v) => !v) },
                  { label: "New arrivals", on: newOnly, toggle: () => setNewOnly((v) => !v) },
                  { label: "In stock", on: inStockOnly, toggle: () => setInStockOnly((v) => !v) },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={t.toggle}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium ${t.on ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="kicker text-muted-foreground">Max price</p>
                <span className="display text-lg leading-none">${maxPrice}</span>
              </div>
              <input
                type="range" min={10} max={MAX_PRICE} step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-3 w-full accent-foreground"
              />
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={resetAll} className="rounded-full border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em]">
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 rounded-full bg-accent py-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground"
              >
                Show {filtered.length} products
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
