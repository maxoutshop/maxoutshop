import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products";
import { Heart } from "lucide-react";
import { useStore, wishlistActions } from "@/lib/store";

export function ProductCard({ product }: { product: Product }) {
  const wished = useStore((s) => s.wishlist.includes(product.slug));
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {product.salePrice && (
          <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase backdrop-blur">
            Sale
          </span>
        )}
        {product.earlyAccess && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold tracking-wider text-accent-foreground uppercase">
            Early
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            wishlistActions.toggle(product.slug);
          }}
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background"
          aria-label="Toggle wishlist"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : ""}`} />
        </button>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{product.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{product.collection}</p>
        </div>
        <div className="text-right text-sm">
          {product.salePrice ? (
            <>
              <div className="font-semibold">${product.salePrice.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground line-through">${product.price.toFixed(2)}</div>
            </>
          ) : (
            <div className="font-semibold">${product.price.toFixed(2)}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
