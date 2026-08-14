import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gift, Loader2, Sparkles, Check, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/auth";
import { useElite } from "@/lib/subscription";
import { useInvalidate } from "@/lib/db";
import { usePointsSummary, useRewards, useRedemptions, redeemReward, usePointsRules } from "@/lib/rewards";
import { fmtNum } from "@/lib/workout-math";

const TITLE = "MAXOUT Points — Member rewards";
const DESC = "Earn MAXOUT Points for training, records and challenges, then redeem them for gear and perks.";

export const Route = createFileRoute("/rewards")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Rewards,
});

function Rewards() {
  const { user, loading } = useSession();
  const uid = user?.id;
  const summary = usePointsSummary(uid);
  const { isElite } = useElite(uid);
  const rewards = useRewards();
  const redemptions = useRedemptions(uid);
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const balance = summary.data?.balance ?? 0;

  const redeem = async (id: string) => {
    setBusy(id); setMsg(null);
    try {
      await redeemReward(id);
      invalidate("points-summary", "redemptions", "rewards", "profile");
      setMsg({ kind: "ok", text: "Redeemed. We'll follow up with fulfilment details." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not redeem that reward." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/profile" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Profile
        </Link>

        <section className="overflow-hidden rounded-3xl border border-border bg-surface p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">MAXOUT Points</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{fmtNum(balance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.data ? `${fmtNum(summary.data.lifetime)} earned all time` : "Train to start earning"}
          </p>
          {isElite ? (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              <Zap className="h-3 w-3" /> Elite 1.5x points
            </span>
          ) : (
            <Link
              to="/elite"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              <Zap className="h-3 w-3" /> Earn 1.5x with ELITE
            </Link>
          )}
        </section>

        {loading && <div className="mt-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

        {!loading && !uid && (
          <Link to="/auth" className="mt-6 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground">
            Sign in to earn points
          </Link>
        )}

        {msg && (
          <p className={`mt-4 rounded-2xl border p-4 text-xs ${msg.kind === "ok" ? "border-accent/40 text-accent" : "border-destructive/40 text-destructive"}`}>
            {msg.text}
          </p>
        )}

        <h2 className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">How to earn</h2>
        <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-surface">
          {earnRules.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-accent" />{r.label}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {typeof r.points === "number" ? `+${r.points}` : r.points}
              </span>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Redeem</h2>
        {rewards.isLoading ? (
          <div className="mt-3 space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface" />)}</div>
        ) : (
          <div className="mt-3 space-y-3">
            {(rewards.data ?? []).filter((r) => r.active).map((r) => {
              const affordable = balance >= r.points_cost;
              const out = r.stock !== null && r.stock <= 0;
              return (
                <div key={r.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{r.title}</h3>
                      {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                      {r.stock !== null && <p className="mt-1 text-[11px] text-muted-foreground">{Math.max(0, r.stock)} left</p>}
                    </div>
                    <Gift className="h-5 w-5 shrink-0 text-accent" />
                  </div>
                  <button
                    disabled={!uid || !affordable || out || busy === r.id}
                    onClick={() => redeem(r.id)}
                    className="mt-4 w-full rounded-full bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
                  >
                    {busy === r.id ? "Redeeming…" : out ? "Out of stock" : affordable ? `Redeem for ${fmtNum(r.points_cost)} pts` : `${fmtNum(r.points_cost - balance)} pts to go`}
                  </button>
                </div>
              );
            })}
            {!(rewards.data ?? []).some((r) => r.active) && (
              <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                New rewards drop soon. Keep stacking points.
              </p>
            )}
          </div>
        )}

        {(redemptions.data ?? []).length > 0 && (
          <>
            <h2 className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Your redemptions</h2>
            <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-surface">
              {(redemptions.data ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.rewards?.title ?? "Reward"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · {fmtNum(r.points_spent)} pts</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] capitalize">
                    {r.status === "fulfilled" && <Check className="h-3 w-3 text-accent" />}{r.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {(summary.data?.ledger ?? []).length > 0 && (
          <>
            <h2 className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Activity</h2>
            <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-surface">
              {(summary.data?.ledger ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{l.reason}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${l.delta > 0 ? "text-accent" : "text-muted-foreground"}`}>
                    {l.delta > 0 ? "+" : ""}{l.delta}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
