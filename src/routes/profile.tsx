import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronRight, Package, Heart, Trophy, Activity, Utensils, Camera, Flag, Settings, HelpCircle, LogOut, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — MAXOUT" }, { name: "description", content: "Your MAXOUT profile, orders, and rewards." }] }),
  component: Profile,
});

function Profile() {
  const wishlistCount = useStore((s) => s.wishlist.length);

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
        <button className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">Create account</button>
        <button className="mt-2 w-full rounded-full border border-border py-3 text-sm font-medium">Sign in</button>
      </div>

      {/* Rewards */}
      <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">Athlete tier</p>
            <h2 className="mt-1 text-2xl font-semibold">1,240 points</h2>
          </div>
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/60">
          <div className="h-full w-[62%] rounded-full bg-foreground" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">760 points to Elite · Unlock early access & 20% off</p>
      </div>

      <div className="mt-6 space-y-2">
        <Row icon={<Package className="h-4 w-4" />} label="Orders" hint="0" />
        <Row icon={<Heart className="h-4 w-4" />} label="Wishlist" hint={String(wishlistCount)} />
        <Row icon={<Trophy className="h-4 w-4" />} label="Rewards" hint="1,240 pts" />
        <Row icon={<Activity className="h-4 w-4" />} label="Fitness progress" />
        <Row icon={<Utensils className="h-4 w-4" />} label="Meal history" />
        <Row icon={<Camera className="h-4 w-4" />} label="Progress photos" hint="Private" />
        <Row icon={<Flag className="h-4 w-4" />} label="Challenges" />
        <Row icon={<Settings className="h-4 w-4" />} label="Settings" />
        <Row icon={<HelpCircle className="h-4 w-4" />} label="Help" />
        <Row icon={<LogOut className="h-4 w-4 text-destructive" />} label="Sign out" />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">Account & backend activate in the next phase.</p>
    </AppShell>
  );
}

function Row({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition hover:bg-secondary/60">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-background/60">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
