import { Link } from "@tanstack/react-router";
import { Heart, Lock } from "lucide-react";
import type { Product } from "@/lib/products";
import { useStore, wishlistActions } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { useElite } from "@/lib/subscription";

export function ProductTile({
  product,
  wide = false,
  index = 0,
}: {
  product: Product;
  wide?: boolean;
  index?: number;
}) {
  const wished = useStore((s) => s.wishlist.includes(product.slug));
  const { user } = useSession();
  const { isElite } = useElite(user?.id);
  const locked = !!product.earlyAccess && !isElite;
  const price = product.salePrice ?? product.price;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`group relative block overflow-hidden rounded-3xl border border-border bg-surface rise ${
        wide ? "col-span-2" : ""
      } ${locked ? "border-accent/40" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <img
        src={product.images[0]}
        alt={product.name}
        loading="lazy"
        className={`w-full object-cover grayscale transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0 group-active:grayscale-0 ${
          wide ? "aspect-[16/10]" : "aspect-[3/4]"
        }`}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/75 to-transparent" />

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {product.newArrival && (
          <span className="rounded-full bg-accent px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-accent-foreground">
            New
          </span>
        )}
        {product.salePrice && (
          <span className="rounded-full border border-border bg-background/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            Sale
          </span>
        )}
        {product.earlyAccess && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-background/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            {locked && <Lock className="h-2.5 w-2.5" />} Early
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          wishlistActions.toggle(product.slug);
        }}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-border bg-background/60 backdrop-blur transition hover:bg-background"
        aria-label="Toggle wishlist"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : ""}`} />
      </button>

      {locked && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/55 backdrop-blur-[2px]">
          <span className="rounded-full border border-accent/60 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.25em]">
            Elite early access
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0">
          {product.collection && (
            <p className="kicker truncate text-muted-foreground">{product.collection}</p>
          )}
          <h3 className={`display mt-1 truncate leading-none ${wide ? "text-3xl" : "text-lg"}`}>
            {product.name}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="display text-lg leading-none">${price.toFixed(2)}</div>
          {product.salePrice && (
            <div className="text-[11px] text-muted-foreground line-through">
              ${product.price.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductTileSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-border bg-surface ${
        wide ? "col-span-2 aspect-[16/10]" : "aspect-[3/4]"
      }`}
    />
  );
}
