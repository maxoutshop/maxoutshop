import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getMyOrders } from "@/lib/wix.functions";
import { useSession } from "@/lib/auth";
import { ArrowLeft, Package, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your orders — MAXOUT" },
      { name: "description", content: "Track your MAXOUT clothing orders and past purchases." },
      { property: "og:title", content: "Your orders — MAXOUT" },
      { property: "og:description", content: "Track your MAXOUT clothing orders and past purchases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { user, loading } = useSession();
  const orders = useQuery({
    queryKey: ["wix-orders", user?.id],
    enabled: !!user,
    queryFn: () => getMyOrders(),
  });

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/profile" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Profile
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Purchases matched to the email on your MAXOUT account.
        </p>

        {(loading || orders.isLoading) && (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !user && (
          <Link
            to="/auth"
            className="mt-6 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
          >
            Sign in to see your orders
          </Link>
        )}

        {orders.isError && (
          <p className="mt-6 rounded-3xl border border-border bg-surface p-5 text-xs text-muted-foreground">
            We couldn't load your orders right now. You can always view them on maxoutshop.com.
          </p>
        )}

        {orders.data && !orders.data.configured && (
          <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold">Order sync isn't connected yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Once the store is connected, every purchase made with this email shows up here automatically.
            </p>
            <a
              href="https://www.maxoutshop.com/account/my-orders"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              View orders on maxoutshop.com <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {orders.data?.configured && orders.data.orders.length === 0 && (
          <div className="mt-6 rounded-3xl border border-border bg-surface p-8 text-center">
            <Package className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No orders yet</p>
            <Link to="/shop" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground">
              Shop the drop
            </Link>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {(orders.data?.orders ?? []).map((o) => (
            <div key={o.id} className="rounded-3xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">Order #{o.number}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""} · {(o.fulfillmentStatus || o.paymentStatus).replace(/_/g, " ")}
                  </p>
                </div>
                <span className="text-sm font-semibold">{o.total}</span>
              </div>
              <div className="mt-3 space-y-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-background">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs">
                      {it.name} <span className="text-muted-foreground">× {it.quantity}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
