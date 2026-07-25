import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

type Search = { category?: string; collection?: string; q?: string; sort?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
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
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
];

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(100);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (search.category) list = list.filter((p) => p.category === search.category || (search.category !== "accessories" && p.category === "unisex"));
    if (search.collection) list = list.filter((p) => p.collection === search.collection);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.collection?.toLowerCase().includes(needle));
    }
    if (sizes.length) list = list.filter((p) => p.sizes.some((s) => sizes.includes(s)));
    list = list.filter((p) => (p.salePrice ?? p.price) <= maxPrice);
    switch (search.sort) {
      case "price-asc": list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break;
      case "price-desc": list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break;
      case "new": list.sort((a, b) => Number(!!b.newArrival) - Number(!!a.newArrival)); break;
    }
    return list;
  }, [search, q, sizes, maxPrice]);

  return (
    <AppShell>
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Shop</h1>
          <button
            onClick={() => setShowFilters(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, collections"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {CATS.map((c) => {
            const active = search.category === c.key;
            return (
              <button
                key={c.label}
                onClick={() => navigate({ search: (prev) => ({ ...prev, category: c.key }) })}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} products</span>
          <select
            value={search.sort ?? "featured"}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, sort: e.target.value }) })}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">No products match your filters.</p>
            <button onClick={() => { setSizes([]); setMaxPrice(100); setQ(""); navigate({ search: {} }); }} className="mt-3 text-sm font-medium underline">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div className="w-full rounded-t-3xl border-t border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["XS","S","M","L","XL","XXL"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
                      sizes.includes(s) ? "border-foreground bg-foreground text-background" : "border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Max price</p>
                <span className="text-sm font-medium">${maxPrice}</span>
              </div>
              <input
                type="range" min={10} max={100} step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-3 w-full accent-foreground"
              />
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Show {filtered.length} products
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
