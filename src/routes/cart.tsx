import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { cartActions, useStore } from "@/lib/store";
import { findVariant, useCatalog } from "@/lib/catalog";
import { createCheckoutClient } from "@/lib/api-client";
import { Minus, Plus, Trash2, ShoppingBag, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — MAXOUT" }, { name: "description", content: "Your MAXOUT cart." }] }),
  component: Cart,
});

function Cart() {
  const cart = useStore((s) => s.cart);
  const { products } = useCatalog();
  const { user } = useSession();
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = cart
    .map((c) => ({ ...c, product: products.find((p) => p.slug === c.slug)! }))
    .filter((i) => i.product);
  const subtotal = items.reduce((n, i) => n + (i.product.salePrice ?? i.product.price) * i.qty, 0);
  const shipping = subtotal > 75 ? 0 : subtotal > 0 ? 7 : 0;

  async function goToCheckout() {
    setBusy(true);
    setError(null);
    try {
      const lines = items.map((i) => {
        const variant = findVariant(i.product, i.size, i.color);
        return {
          productId: i.productId ?? i.product.id ?? "",
          variantId: i.variantId ?? variant?.id,
          quantity: i.qty,
          options: { ...(i.size ? { Size: i.size } : {}), ...(i.color ? { Color: i.color } : {}) },
        };
      });
      if (lines.some((l) => !l.productId)) {
        throw new Error("Some items need to be re-added before checkout.");
      }
      const { url } = await createCheckoutClient({ lines, email: user?.email ?? undefined });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }


  if (items.length === 0) {
    return (
      <AppShell>
        <div className="mt-20 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Your cart is empty</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start with our best sellers or the latest drop.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Shop</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="pt-2 text-2xl font-semibold">Cart</h1>

      <div className="mt-4 space-y-3">
        {items.map((i, idx) => (
          <div key={idx} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
            <Link to="/product/$slug" params={{ slug: i.slug }} className="shrink-0">
              <img src={i.product.images[0]} alt={i.product.name} className="h-24 w-20 rounded-xl object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">{i.product.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{i.color} · Size {i.size}</p>
                </div>
                <button onClick={() => cartActions.remove(idx)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="inline-flex items-center rounded-full border border-border">
                  <button onClick={() => cartActions.update(idx, i.qty - 1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-xs font-medium">{i.qty}</span>
                  <button onClick={() => cartActions.update(idx, i.qty + 1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-semibold">${((i.product.salePrice ?? i.product.price) * i.qty).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex gap-2">
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Promo code"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none"
          />
          <button className="rounded-full border border-border px-4 text-sm font-medium">Apply</button>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        <Row label="Estimated shipping" value={shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`} />
        <div className="my-3 border-t border-border" />
        <Row label={<span className="text-base font-semibold text-foreground">Total</span>} value={<span className="text-base font-semibold text-foreground">${(subtotal + shipping).toFixed(2)}</span>} />
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      <button
        onClick={goToCheckout}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…</>) : (<>Checkout <ExternalLink className="h-4 w-4" /></>)}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Your full cart carries over to maxoutshop.com — no need to re-add anything.
      </p>

    </AppShell>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
