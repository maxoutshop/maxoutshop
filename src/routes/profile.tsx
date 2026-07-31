import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronRight, Package, Heart, Trophy, Activity, Utensils, Flag, LogOut, Sparkles, Megaphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useSession, initials } from "@/lib/auth";
import { useProfile, usePoints, useMyChallenges, usePRs, useWorkouts } from "@/lib/db";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Rewards — MAXOUT" },
      { name: "description", content: "Your MAXOUT member profile: reward points, tier progress, challenges and ambassador tools." },
      { property: "og:title", content: "Profile & Rewards — MAXOUT" },
      { property: "og:description", content: "Track your MAXOUT tier, points and member perks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

const TIERS = [
  { name: "Rookie", min: 0, perk: "Member pricing" },
  { name: "Athlete", min: 500, perk: "Early access to drops" },
  { name: "Elite", min: 2000, perk: "20% off + free shipping" },
  { name: "Legend", min: 5000, perk: "Ambassador invite" },
];

function Profile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const wishlistCount = useStore((s) => s.wishlist.length);
  const profile = useProfile(user?.id);
  const points = usePoints(user?.id);
  const challenges = useMyChallenges(user?.id);
  const prs = usePRs(user?.id);
  const workouts = useWorkouts(user?.id);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (!user) {
    return (
      <AppShell>
        <div className="pt-2">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-secondary to-surface text-lg font-semibold">M</div>
            <div>
              <h1 className="text-xl font-semibold">Sign in to MAXOUT</h1>
              <p className="text-xs text-muted-foreground">Create an account to unlock rewards, tracking, and early access.</p>
            </div>
          </div>
          <Link to="/auth" className="mt-4 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Create account</Link>
          <Link to="/auth" className="mt-2 block w-full rounded-full border border-border py-3 text-center text-sm font-medium">Sign in</Link>
        </div>
        <div className="mt-6 space-y-2">
          <Row icon={<Heart className="h-4 w-4" />} label="Wishlist" hint={String(wishlistCount)} to="/shop" />
        </div>
        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">MAXOUT Rewards</p>
          <div className="mt-3 space-y-2">
            {TIERS.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.min}+ pts · {t.perk}</span>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const pts = profile.data?.points ?? 0;
  const tierIndex = Math.max(0, TIERS.findIndex((t, i) => pts >= t.min && (i === TIERS.length - 1 || pts < TIERS[i + 1]!.min)));
  const tier = TIERS[tierIndex]!;
  const next = TIERS[tierIndex + 1];
  const pct = next ? Math.round(((pts - tier.min) / (next.min - tier.min)) * 100) : 100;
  const name = profile.data?.display_name ?? profile.data?.username ?? user.email?.split("@")[0] ?? "Athlete";

  return (
    <AppShell>
      <div className="pt-2">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-secondary to-surface text-lg font-semibold">{initials(name)}</div>
          <div>
            <h1 className="text-xl font-semibold">{name}</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">{tier.name} tier</p>
            <h2 className="mt-1 text-2xl font-semibold">{pts.toLocaleString()} points</h2>
          </div>
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/60">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(4, pct))}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {next ? `${(next.min - pts).toLocaleString()} points to ${next.name} · ${next.perk}` : `Top tier unlocked · ${tier.perk}`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat value={String((workouts.data ?? []).length)} label="Workouts" />
        <Stat value={String((prs.data ?? []).length)} label="PRs" />
        <Stat value={String((challenges.data ?? []).length)} label="Challenges" />
      </div>

      {profile.data?.is_ambassador && (
        <div className="mt-4 rounded-3xl border border-accent/40 bg-accent/5 p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Ambassador dashboard</h2>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xl font-semibold">{Math.round(pts / 10)}</p><p className="text-[11px] text-muted-foreground">Referrals</p></div>
            <div><p className="text-xl font-semibold">${(pts / 4).toFixed(0)}</p><p className="text-[11px] text-muted-foreground">Commission</p></div>
            <div><p className="text-xl font-semibold">15%</p><p className="text-[11px] text-muted-foreground">Code discount</p></div>
          </div>
          <p className="mt-4 rounded-2xl bg-background/60 px-4 py-3 text-center text-sm font-semibold tracking-widest">
            {(profile.data.username ?? name).toUpperCase().slice(0, 10)}15
          </p>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Row icon={<Package className="h-4 w-4" />} label="Orders" hint="On maxoutshop.com" />
        <Row icon={<Heart className="h-4 w-4" />} label="Wishlist" hint={String(wishlistCount)} to="/shop" />
        <Row icon={<Activity className="h-4 w-4" />} label="Fitness progress" to="/track" />
        <Row icon={<Utensils className="h-4 w-4" />} label="Meal history" to="/track" />
        <Row icon={<Flag className="h-4 w-4" />} label="Challenges" to="/community" />
      </div>


      <button onClick={signOut} className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-background/60"><LogOut className="h-4 w-4 text-destructive" /></span>
        <span className="flex-1 text-sm font-medium">Sign out</span>
      </button>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ icon, label, hint, to }: { icon: React.ReactNode; label: string; hint?: string; to?: string }) {
  const inner = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-background/60">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition hover:bg-secondary/60";
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button className={cls}>{inner}</button>;
}
