import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getAdminCatalog, saveProductMeta } from "@/lib/wix.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Save, Package } from "lucide-react";

export const Route = createFileRoute('/_authenticated/admin/products')({
  head: () => ({
    meta: [
      { title: "Admin — Products — MAXOUT" },
      { name: "description", content: "Manage product tags, drops, and visibility for the MAXOUT app catalog." },
      { property: "og:title", content: "Admin — Products — MAXOUT" },
      { property: "og:description", content: "Manage product tags and drops for the MAXOUT app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    return await getAdminCatalog();
  },
  component: AdminProducts,
});

type Draft = {
  category: string;
  collection: string;
  dropDate: string;
  bestSeller: boolean;
  newArrival: boolean;
  earlyAccess: boolean;
  hidden: boolean;
};

function AdminProducts() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const saveFn = useServerFn(saveProductMeta);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    for (const p of initial) {
      map[p.slug] = {
        category: p.category ?? "unisex",
        collection: p.collection ?? "",
        dropDate: p.dropDate ?? "",
        bestSeller: !!p.bestSeller,
        newArrival: !!p.newArrival,
        earlyAccess: !!p.earlyAccess,
        hidden: !!p.hidden,
      };
    }
    return map;
  });

  const { data: products } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => getAdminCatalog(),
    initialData: initial,
  });

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      // Live products first, then by name
      if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  async function updateField(slug: string, patch: Partial<Draft>) {
    const next = { ...drafts[slug]!, ...patch };
    setDrafts((prev) => ({ ...prev, [slug]: next }));
  }

  async function save(slug: string) {
    const d = drafts[slug];
    if (!d) return;
    setSavingSlug(slug);
    setMessage(null);
    try {
      await saveFn({ data: {
        slug,
        category: d.category,
        collection: d.collection || undefined,
        bestSeller: d.bestSeller,
        newArrival: d.newArrival,
        earlyAccess: d.earlyAccess,
        hidden: d.hidden,
        dropDate: d.dropDate || null,
      }});
      setMessage({ type: "ok", text: "Saved." });
      await qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      await qc.invalidateQueries({ queryKey: ["wix-catalog"] });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to save" });
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <AppShell>
      <div className="pt-2">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Product tags</h1>
            <p className="text-xs text-muted-foreground">Control drops, badges, and visibility.</p>
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${message.type === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {message.text}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {sorted.map((p) => {
            const d = drafts[p.slug] ?? {
              category: p.category ?? "unisex",
              collection: p.collection ?? "",
              dropDate: p.dropDate ?? "",
              bestSeller: !!p.bestSeller,
              newArrival: !!p.newArrival,
              earlyAccess: !!p.earlyAccess,
              hidden: !!p.hidden,
            };
            return (
              <div key={p.slug} className={`rounded-3xl border bg-surface p-4 ${p.hidden ? "border-muted-foreground/30 opacity-70" : "border-border"}`}>
                <div className="flex gap-3">
                  <img src={p.images[0]} alt={p.name} className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.bestSeller && <Badge>Best</Badge>}
                      {p.newArrival && <Badge>New</Badge>}
                      {p.earlyAccess && <Badge>Early</Badge>}
                      {p.hidden && <Badge muted>Hidden</Badge>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Category</label>
                    <input
                      type="text"
                      value={d.category}
                      onChange={(e) => updateField(p.slug, { category: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Collection</label>
                    <input
                      type="text"
                      value={d.collection}
                      onChange={(e) => updateField(p.slug, { collection: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Drop date</label>
                    <input
                      type="date"
                      value={d.dropDate}
                      onChange={(e) => updateField(p.slug, { dropDate: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/50"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Toggle label="Best seller" value={d.bestSeller} onChange={(v) => updateField(p.slug, { bestSeller: v })} />
                  <Toggle label="New arrival" value={d.newArrival} onChange={(v) => updateField(p.slug, { newArrival: v })} />
                  <Toggle label="Early access" value={d.earlyAccess} onChange={(v) => updateField(p.slug, { earlyAccess: v })} />
                  <Toggle label="Hidden in app" value={d.hidden} onChange={(v) => updateField(p.slug, { hidden: v })} />
                </div>

                <button
                  onClick={() => save(p.slug)}
                  disabled={savingSlug === p.slug}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSlug === p.slug ? "Saving..." : "Save"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-semibold">How tagging works</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Products are pulled live from your Wix store. Set a drop date to auto-badge the product as New for 14 days. Hidden products still exist on Wix but are hidden in the app.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Badge({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${muted ? "bg-muted-foreground/20 text-muted-foreground" : "bg-foreground/10 text-foreground"}`}>
      {children}
    </span>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-foreground"
      />
    </label>
  );
}
