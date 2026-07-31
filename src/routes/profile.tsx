import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronRight, Package, Heart, Activity, Utensils, Flag, LogOut, Megaphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useSession, initials } from "@/lib/auth";
import { useProfile, useMyChallenges, usePRs, useWorkouts } from "@/lib/db";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MAXOUT" },
      { name: "description", content: "Your MAXOUT member profile: training stats, challenges and ambassador tools." },
      { property: "og:title", content: "Profile — MAXOUT" },
      { property: "og:description", content: "Your MAXOUT member profile, training stats and challenges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const wishlistCount = useStore((s) => s.wishlist.length);
  const profile = useProfile(user?.id);
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
              <p className="text-xs text-muted-foreground">Create an account for tracking, challenges and early access.</p>
            </div>
          </div>
          <Link to="/auth" className="mt-4 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Create account</Link>
          <Link to="/auth" className="mt-2 block w-full rounded-full border border-border py-3 text-center text-sm font-medium">Sign in</Link>
        </div>
        <div className="mt-6 space-y-2">
          <Row icon={<Heart className="h-4 w-4" />} label="Wishlist" hint={String(wishlistCount)} to="/shop" />
        </div>
      </AppShell>
    );
  }



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

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={String((workouts.data ?? []).length)} label="Workouts" />
        <Stat value={String((prs.data ?? []).length)} label="PRs" />
        <Stat value={String((challenges.data ?? []).length)} label="Challenges" />
      </div>

      <Link
        to="/elite"
        className="mt-4 flex items-center justify-between rounded-3xl border border-accent/40 bg-accent/5 p-5"
      >
        <div>
          <p className="text-sm font-semibold tracking-tight">MAXOUT ELITE</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isElite ? "Membership active — manage billing" : "Unlock photo food logging with AI macros"}
          </p>
        </div>
        <span className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">
          {isElite ? "Manage" : "Join"}
        </span>
      </Link>

      {profile.data?.is_ambassador && (
        <div className="mt-4 rounded-3xl border border-accent/40 bg-accent/5 p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Ambassador dashboard</h2>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Your personal discount code — 15% off for your followers.</p>
          <p className="mt-3 rounded-2xl bg-background/60 px-4 py-3 text-center text-sm font-semibold tracking-widest">
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
