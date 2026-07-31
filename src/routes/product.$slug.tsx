import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { cartActions, recentActions, useStore, wishlistActions } from "@/lib/store";
import { getCatalog } from "@/lib/wix.functions";
import { FALLBACK_CATALOG, type CatalogProduct } from "@/lib/catalog-meta";
import { findVariant, relatedFrom } from "@/lib/catalog";
import { Heart, Minus, Plus, ChevronDown, ChevronUp, Truck, RotateCcw, Ruler, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { useElite } from "@/lib/subscription";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    let list: CatalogProduct[] = FALLBACK_CATALOG;
    try {
      const live = await getCatalog();
      if (live?.length) list = live as CatalogProduct[];
    } catch {
      // fall back to the bundled catalog snapshot
    }
    const p = list.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { product: p, related: relatedFrom(list, params.slug) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found — MAXOUT" }, { name: "robots", content: "noindex" }] };
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — MAXOUT` },
        { name: "description", content: product.description.slice(0, 155) },
        { property: "og:title", content: `${product.name} — MAXOUT` },
        { property: "og:description", content: product.description.slice(0, 155) },
        { property: "og:image", content: product.images[0] },
        { name: "twitter:image", content: product.images[0] },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related: relatedItems } = Route.useLoaderData() as {
    product: CatalogProduct;
    related: CatalogProduct[];
  };
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0]! : null);
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const wished = useStore((s) => s.wishlist.includes(product.slug));

  useEffect(() => { recentActions.push(product.slug); }, [product.slug]);

  const variant = useMemo(
    () => findVariant(product, size ?? undefined, color ?? undefined),
    [product, size, color],
  );
  const soldOut = !!variant && !variant.inStock;
  const { user } = useSession();
  const { isElite } = useElite(user?.id);
  const eliteLocked = !!product.earlyAccess && !isElite;
  const canAdd = !!size && !!color && !soldOut && !eliteLocked;



  return (
    <AppShell>
      <div className="-mx-4">
        <div className="relative bg-secondary">
          <img src={product.images[imgIdx]} alt={product.name} className="aspect-[3/4] w-full object-cover" />
          {product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-6 bg-foreground" : "w-1.5 bg-foreground/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-5">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">{product.collection}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-balance">{product.name}</h1>
          <button onClick={() => wishlistActions.toggle(product.slug)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border">
            <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : ""}`} />
          </button>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          {product.salePrice ? (
            <>
              <span className="text-xl font-semibold">${product.salePrice.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground line-through">${product.price.toFixed(2)}</span>
              {product.saleTag && <span className="ml-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">{product.saleTag}</span>}
            </>
          ) : (
            <span className="text-xl font-semibold">${product.price.toFixed(2)}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {soldOut ? "Sold out in this combination" : "In stock · Ships within 3–5 business days"}
        </p>


        {/* Colors */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Color</p>
            <span className="text-xs text-muted-foreground">{color}</span>
          </div>
          <div className="flex gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.name)}
                aria-label={c.name}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${color === c.name ? "border-foreground" : "border-border"}`}
              >
                <span className="h-6 w-6 rounded-full border border-border/60" style={{ backgroundColor: c.hex }} />
              </button>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Size</p>
            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Ruler className="h-3 w-3" /> Size guide
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-12 rounded-full border px-4 py-2 text-sm font-medium ${size === s ? "border-foreground bg-foreground text-background" : "border-border"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Qty */}
        <div className="mt-6 flex items-center gap-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Qty</p>
          <div className="inline-flex items-center rounded-full border border-border">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-6 text-center text-sm font-medium">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="grid h-10 w-10 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Add */}
        <button
          disabled={!canAdd}
          onClick={() => {
            cartActions.add({
              slug: product.slug,
              size: size!,
              color: color!,
              qty,
              productId: product.id,
              variantId: variant?.id,
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 1400);
          }}
          className="mt-6 w-full rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground transition"
        >
          {soldOut ? "Sold out" : !canAdd ? "Select size & color" : added ? "Added to cart" : `Add to cart · $${((variant?.price ?? product.salePrice ?? product.price) * qty).toFixed(2)}`}
        </button>


        {/* Description */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">Description</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{product.description}</p>
        </div>

        <Accordion title="Specifications">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {product.specs.map((s) => <li key={s} className="flex gap-2"><span>·</span><span>{s}</span></li>)}
          </ul>
        </Accordion>

        <Accordion title="Care">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {product.care.map((s) => <li key={s} className="flex gap-2"><span>·</span><span>{s}</span></li>)}
          </ul>
        </Accordion>

        <Accordion title="Shipping & Returns" icon={<Truck className="h-4 w-4" />}>
          <p className="text-sm text-muted-foreground">Free shipping on orders over $75. Standard delivery in 3–5 business days.</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><RotateCcw className="h-4 w-4" /> 30-day returns on unworn items with tags.</p>
        </Accordion>

        {relatedItems.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">You might also like</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {relatedItems.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">View on maxoutshop.com</a>
        </p>
      </div>
    </AppShell>
  );
}

function Accordion({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-4 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">{icon}{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}
