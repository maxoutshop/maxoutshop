import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { initials } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verify")({
  head: () => ({
    meta: [
      { title: "Admin — Verification — MAXOUT" },
      { name: "description", content: "Grant or remove verified checkmarks for MAXOUT athlete accounts." },
      { property: "og:title", content: "Admin — Verification — MAXOUT" },
      { property: "og:description", content: "Manage verified athlete accounts in the MAXOUT app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminVerify,
});

function AdminVerify() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const people = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, verified")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ verified }).eq("id", id);
      if (error) throw error;
      return verified;
    },
    onSuccess: (verified) => {
      toast.success(verified ? "Account verified" : "Verification removed");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["athletes"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = people.data ?? [];
    if (!term) return rows;
    return rows.filter(
      (p) =>
        (p.username ?? "").toLowerCase().includes(term) ||
        (p.display_name ?? "").toLowerCase().includes(term),
    );
  }, [people.data, q]);

  return (
    <AppShell>
      <div className="px-5 pb-24 pt-6">
        <Link to="/profile" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-accent" /> Verification
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Give athletes the white checkmark shown across the feed and their profile.
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or @handle"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-4 space-y-2">
          {people.isLoading && <p className="text-xs text-muted-foreground">Loading accounts…</p>}
          {!people.isLoading && list.length === 0 && (
            <p className="text-xs text-muted-foreground">No accounts match that search.</p>
          )}
          {list.map((p) => {
            const name = p.display_name ?? p.username ?? "Athlete";
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-background text-xs font-semibold">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    initials(name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <span className="truncate">{name}</span>
                    {p.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">@{p.username ?? "—"}</p>
                </div>
                <button
                  onClick={() => toggle.mutate({ id: p.id, verified: !p.verified })}
                  disabled={toggle.isPending}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                    p.verified
                      ? "border border-border text-muted-foreground"
                      : "bg-foreground text-background"
                  }`}
                >
                  {p.verified ? "Remove" : "Verify"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
