import { VerifiedBadge } from "@/components/VerifiedBadge";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChevronRight, Package, Heart, Activity, Utensils, Flag, LogOut, Megaphone, Settings, Camera, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useSession, initials } from "@/lib/auth";
import { useProfile, useMyChallenges, usePRs, useWorkouts, useRoles, uploadAvatar, useMutate } from "@/lib/db";
import { useElite } from "@/lib/subscription";


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
  const { user, loading: sessionLoading } = useSession();
  const [editing, setEditing] = useState(false);

  const wishlistCount = useStore((s) => s.wishlist.length);
  const profile = useProfile(user?.id);
  const { isElite, comped } = useElite(user?.id);
  const roles = useRoles(user?.id);
  const isAdmin = (roles.data ?? []).includes("admin");
  const challenges = useMyChallenges(user?.id);
  const prs = usePRs(user?.id);
  const workouts = useWorkouts(user?.id);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (sessionLoading) {
    return (
      <AppShell>
        <div className="space-y-3 pt-10">
          <div className="h-20 animate-pulse rounded-3xl bg-surface" />
          <div className="h-24 animate-pulse rounded-3xl bg-surface" />
          <div className="h-40 animate-pulse rounded-3xl bg-surface" />
        </div>
      </AppShell>
    );
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
          <AvatarPicker userId={user.id} name={name} url={profile.data?.avatar_url ?? null} />
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              <span className="truncate">{name}</span>
              {profile.data?.verified && <VerifiedBadge className="h-4 w-4" />}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {profile.data?.username ? `@${profile.data.username}` : user.email}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
              >
                Edit profile
              </button>
              {profile.data?.username && (
                <Link
                  to="/u/$handle"
                  params={{ handle: profile.data.username }}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
                >
                  View public profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {editing && <EditProfileSheet userId={user.id} profile={profile.data} onClose={() => setEditing(false)} />}

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
            {isElite ? (comped ? "Comped membership — active" : "Membership active — manage billing") : "Unlock photo food logging with AI macros"}
          </p>
        </div>
        <span className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">
          {isElite ? (comped ? "View" : "Manage") : "Join"}
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
        {isAdmin && (
          <Row icon={<Settings className="h-4 w-4" />} label="Admin console" to="/admin" />
        )}


        <Row icon={<Package className="h-4 w-4" />} label="Orders" to="/orders" />
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

function AvatarPicker({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function onPick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadAvatar(userId, file);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["athletes"] });
      await qc.invalidateQueries({ queryKey: ["posts"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className="relative shrink-0"
      aria-label="Change profile picture"
    >
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-secondary to-surface text-lg font-semibold">
        {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials(name)}
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground ring-2 ring-background">
        <Camera className="h-3 w-3" />
      </span>
      {busy && <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70 text-[10px]">…</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
    </button>
  );
}

type ProfileRow = { username: string | null; display_name: string | null; bio: string | null } | null | undefined;

function EditProfileSheet({ userId, profile, onClose }: { userId: string; profile: ProfileRow; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [error, setError] = useState("");

  const save = useMutate(async () => {
    const handle = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const { error: err } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: handle || null,
        bio: bio.trim() || null,
      })
      .eq("id", userId);
    if (err) throw err;
  }, ["profile", "athletes", "posts", "profile-by-username"]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-in w-full rounded-t-3xl border-t border-border bg-surface p-5 pb-10 slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit profile</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <label className="mt-4 block text-[11px] uppercase tracking-widest text-muted-foreground">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />

        <label className="mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.slice(0, 24))}
          placeholder="handle"
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />

        <label className="mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          rows={3}
          placeholder="Powerlifter. 5am club. MAXOUT athlete."
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <button
          disabled={save.isPending}
          onClick={() =>
            save.mutate(undefined as never, {
              onSuccess: onClose,
              onError: (e: unknown) =>
                setError(
                  (e as { message?: string })?.message?.includes("duplicate")
                    ? "That username is taken."
                    : "Could not save. Try again.",
                ),
            })
          }
          className="mt-4 w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
