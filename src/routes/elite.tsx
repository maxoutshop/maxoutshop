import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check, Crown, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useSession } from "@/lib/auth";
import { useElite } from "@/lib/subscription";
import { ELITE_PRICES, getStripeEnvironment } from "@/lib/stripe";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { createPortalSession } from "@/utils/payments.functions";

export const Route = createFileRoute("/elite")({
  head: () => ({
    meta: [
      { title: "MAXOUT ELITE — Premium Membership" },
      {
        name: "description",
        content:
          "Unlock MAXOUT ELITE: snap a photo of your plate and get instant AI macros, plus elite-only member perks.",
      },
      { property: "og:title", content: "MAXOUT ELITE — Premium Membership" },
      {
        property: "og:description",
        content: "Photo food logging with AI macros and elite-only perks for MAXOUT members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElitePage,
});

const PERKS = [
  { icon: Camera, title: "Photo food logging", body: "Snap your plate — AI reads the items and macros." },
  { icon: Sparkles, title: "Unlimited AI estimates", body: "Describe any meal and log it in one tap." },
  { icon: Crown, title: "Elite badge + early drops", body: "Stand out in the feed and shop drops first." },
];

function ElitePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { isElite, subscription } = useElite(user?.id);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manage() {
    setBusy(true);
    setError(null);
    try {
      const res = await createPortalSession({
        data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <PaymentTestModeBanner />
      <div className="px-5 pt-5">
        <button onClick={() => navigate({ to: "/track" })} className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Crown className="h-3 w-3" /> Membership
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">MAXOUT ELITE</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log food by photo. Let the AI do the math. Train like it's your job.
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
              {subscription?.cancel_at_period_end
                ? `Access ends ${new Date(subscription.current_period_end!).toLocaleDateString()}.`
                : subscription?.current_period_end
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}.`
                  : "Membership active."}
            </p>
            <button
              onClick={manage}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-xs font-semibold disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Manage membership
            </button>
          </div>
        )}

        {user && !isElite && !checkout && (
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
              onClick={() => setCheckout(true)}
              className="mt-5 w-full rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition"
            >
              Go ELITE
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Cancel anytime — access runs to the end of your billing period.</p>

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


        {user && !isElite && checkout && (
          <div className="mt-7 overflow-hidden rounded-3xl bg-white">
            <StripeEmbeddedCheckout
              priceId={ELITE_PRICES[plan].id}
              returnUrl={`${window.location.origin}/elite?checkout=success`}
            />
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
