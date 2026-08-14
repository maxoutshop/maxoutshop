import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Camera,
  Check,
  Crown,
  Loader2,
  Sparkles,
  ArrowLeft,
  Ticket,
  LineChart,
  Flame,
  ShoppingBag,
  FileText,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { redeemPromoCode } from "@/lib/promo.functions";
import { useSession } from "@/lib/auth";
import { useElite, useMembershipSync } from "@/lib/subscription";
import { openEliteManagement, startEliteCheckout } from "@/lib/elite-client";

export const Route = createFileRoute("/elite")({
  head: () => ({
    meta: [
      { title: "MAXOUT ELITE — Premium Membership" },
      {
        name: "description",
        content:
          "Unlock MAXOUT ELITE: AI photo food logging, advanced analytics, weekly reports, 1.5x points and member-only shop perks.",
      },
      { property: "og:title", content: "MAXOUT ELITE — Premium Membership" },
      {
        property: "og:description",
        content: "AI coaching, deep analytics, streak protection and elite-only drops for MAXOUT members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElitePage,
});

const ELITE_PRICES = {
  monthly: { label: "Monthly", amount: "$9.99", per: "/mo" },
  yearly: { label: "Yearly", amount: "$89.99", per: "/yr" },
} as const;

const PERKS = [
  { icon: Camera, title: "Photo food logging", body: "Snap your plate — AI reads the items and macros." },
  { icon: Sparkles, title: "Unlimited AI coach", body: "Programming, form cues and nutrition, tuned to your data." },
  { icon: LineChart, title: "Advanced analytics", body: "Volume, strength curves and muscle-group balance over time." },
  { icon: FileText, title: "Weekly reports", body: "Every Monday: training, nutrition and what to fix next." },
  { icon: Zap, title: "1.5x member points", body: "Every point you earn is multiplied while you're ELITE." },
  { icon: Flame, title: "Streak protection", body: "Miss a day? A freeze keeps your streak alive." },
  { icon: ShoppingBag, title: "Shop perks", body: "Early access to drops, elite-only pieces and member pricing." },
];

function ElitePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { isElite, comped, entitlement } = useElite(user?.id);
  useMembershipSync(user?.id);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  async function redeem() {
    setRedeeming(true);
    setCodeMsg(null);
    try {
      const res = await redeemPromoCode({ data: { code } });
      if (!res.ok) {
        setCodeMsg(res.error);
        return;
      }
      setCodeMsg("Code applied — welcome to ELITE.");
      setCode("");
      await qc.invalidateQueries({ queryKey: ["entitlement"] });
    } catch {
      setCodeMsg("Could not redeem that code. Try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function manage() {
    setBusy(true);
    setError(null);
    try {
      await openEliteManagement();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open membership management");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await startEliteCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  const ends = entitlement.expiresAt ? new Date(entitlement.expiresAt).toLocaleDateString() : null;

  return (
    <div className="min-h-screen pb-28">
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate({ to: "/track" })}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Crown className="h-3 w-3" /> Membership
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">MAXOUT ELITE</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full MAXOUT system — AI coaching, deep analytics, member perks. Train like it's your job.
        </p>

        <div className="mt-7 space-y-3">
          {PERKS.map((p) => (
            <div key={p.title} className="flex gap-3 rounded-3xl border border-border bg-surface p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-background">
                <p.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        {!user && (
          <Link
            to="/auth"
            className="mt-7 flex w-full items-center justify-center rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground"
          >
            Sign in to join ELITE
          </Link>
        )}

        {user && isElite && (
          <div className="mt-7 rounded-3xl border border-border bg-surface p-5">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Check className="h-4 w-4" /> You're ELITE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {comped
                ? ends
                  ? `Comped membership — active until ${ends}.`
                  : "Comped membership — no billing on this account."
                : entitlement.cancelAtPeriodEnd
                  ? `${entitlement.planName ?? "Membership"} — access ends ${ends ?? "at period end"}.`
                  : ends
                    ? `${entitlement.planName ?? "Membership"} — renews ${ends}.`
                    : `${entitlement.planName ?? "Membership"} active.`}
            </p>
            {!comped && (
              <button
                onClick={manage}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-xs font-semibold uppercase tracking-widest text-background disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} MANAGE ELITE
              </button>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/coach" className="rounded-full border border-border py-3 text-center text-[11px] font-semibold uppercase tracking-widest">
                MAXOUT Coach
              </Link>
              <Link to="/rewards" className="rounded-full border border-border py-3 text-center text-[11px] font-semibold uppercase tracking-widest">
                Points
              </Link>
            </div>
          </div>
        )}

        {user && !isElite && (
          <div className="mt-7">
            <div className="flex gap-2">
              {(["monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 rounded-3xl border p-4 text-left transition ${
                    plan === p ? "border-foreground bg-surface" : "border-border"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{ELITE_PRICES[p].label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {ELITE_PRICES[p].amount}
                    <span className="text-xs font-normal text-muted-foreground">{ELITE_PRICES[p].per}</span>
                  </p>
                  {p === "yearly" && <p className="mt-1 text-[11px] text-accent">Save 25%</p>}
                </button>
              ))}
            </div>
            <button
              onClick={join}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} JOIN MAXOUT ELITE
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Billed securely by MAXOUT on maxoutshop.com. Cancel anytime — access runs to the end of your billing
              period.
            </p>

            <div className="mt-6 rounded-3xl border border-border bg-surface p-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <Ticket className="h-3.5 w-3.5" /> Have a promo code?
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="MAXOUT-XXXXX-XXXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-xs tracking-widest outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-foreground"
                />
                <button
                  onClick={redeem}
                  disabled={redeeming || code.trim().length < 4}
                  className="rounded-full bg-foreground px-5 text-xs font-semibold text-background disabled:opacity-40"
                >
                  {redeeming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </button>
              </div>
              {codeMsg && <p className="mt-3 text-[11px] text-muted-foreground">{codeMsg}</p>}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
