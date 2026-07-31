import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EliteBadge } from "@/components/EliteBadge";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FeedPost } from "@/components/FeedPost";
import { supabase } from "@/integrations/supabase/client";
import { initials, useSession } from "@/lib/auth";
import { useCheers, useMutate, useProfileByUsername, usePRs, useUserPosts, useWorkouts } from "@/lib/db";
import { BadgeCheck, Dumbbell, Trophy, Flame, ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/u/$handle")({
  head: () => ({
    meta: [
      { title: "Athlete profile — MAXOUT" },
      { name: "description", content: "See this MAXOUT athlete's workouts, personal records and send them some hype." },
      { property: "og:title", content: "Athlete profile — MAXOUT" },
      { property: "og:description", content: "Workouts, PRs and hype from the MAXOUT community." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AthleteProfile,
});

const CHEER_EMOJIS = ["🔥", "💪", "👏", "🏆", "🚀"] as const;

function AthleteProfile() {
  const { handle } = useParams({ from: "/u/$handle" });
  const { user } = useSession();
  const uid = user?.id;
  const profile = useProfileByUsername(handle);
  const athleteId = profile.data?.id;
  const workouts = useWorkouts(athleteId);
  const prs = usePRs(athleteId);
  const posts = useUserPosts(athleteId);
  const cheers = useCheers(athleteId);

  const name = profile.data?.display_name ?? profile.data?.username ?? "MAXOUT athlete";
  const isMe = !!uid && uid === athleteId;

  const volume = useMemo(() => {
    let total = 0;
    for (const w of workouts.data ?? []) {
      for (const s of (w as { workout_sets?: { weight: number | null; reps: number | null }[] }).workout_sets ?? []) {
        total += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }
    }
    return total;
  }, [workouts.data]);

  if (!user) {
    return (
      <AppShell>
        <div className="mt-10 rounded-3xl border border-border bg-surface p-8 text-center">
          <h1 className="text-lg font-semibold">Athlete profiles are for members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to see workouts, PRs and send hype.</p>
          <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
            Join MAXOUT
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!profile.isLoading && !profile.data) {
    return (
      <AppShell>
        <div className="mt-10 text-center">
          <h1 className="text-lg font-semibold">Athlete not found</h1>
          <Link to="/community" className="mt-3 inline-block text-sm text-accent">Back to the floor</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-5 sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-xl">
        <Link to="/community" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full border border-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="truncate text-sm font-semibold">{profile.data?.username ? `@${profile.data.username}` : name}</p>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="rounded-full bg-gradient-to-br from-accent to-destructive p-[2px]">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-surface text-lg font-semibold ring-2 ring-background">
            {profile.data?.avatar_url ? (
              <img src={profile.data.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-xl font-semibold">
            <span className="truncate">{name}</span>
            {profile.data?.verified && <VerifiedBadge className="h-4 w-4" />}
            {(profile.data as { is_elite?: boolean } | undefined)?.is_elite && <EliteBadge className="h-3.5 w-3.5" />}
            {profile.data?.is_ambassador && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
          </h1>
          {profile.data?.bio && <p className="mt-1 text-xs text-muted-foreground">{profile.data.bio}</p>}
          {isMe && (
            <Link to="/profile" className="mt-2 inline-block rounded-full border border-border px-3 py-1 text-[11px] font-semibold">
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat icon={<Dumbbell className="h-3.5 w-3.5" />} value={String((workouts.data ?? []).length)} label="Workouts" />
        <Stat icon={<Trophy className="h-3.5 w-3.5" />} value={String((prs.data ?? []).length)} label="PRs" />
        <Stat icon={<Flame className="h-3.5 w-3.5" />} value={volume ? `${Math.round(volume / 1000)}k` : "0"} label="Volume lb" />
      </div>

      {!isMe && uid && athleteId && <CheerBar fromId={uid} toId={athleteId} name={name} />}

      <Section title="Personal records">
        {(prs.data ?? []).length === 0 ? (
          <Empty text="No PRs logged yet." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(prs.data ?? []).slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{p.exercise}</p>
                <p className="mt-1 text-xl font-semibold">
                  {Number(p.value)}
                  <span className="ml-1 text-xs text-muted-foreground">{p.unit}</span>
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.achieved_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent workouts">
        {(workouts.data ?? []).length === 0 ? (
          <Empty text="No workouts logged yet." />
        ) : (
          <div className="space-y-2">
            {(workouts.data ?? []).slice(0, 8).map((w) => {
              const sets = (w as { workout_sets?: unknown[] }).workout_sets ?? [];
              return (
                <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-background/60">
                    <Dumbbell className="h-4 w-4 text-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title ?? w.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(w.performed_at).toLocaleDateString()} · {sets.length} sets
                      {w.duration_min ? ` · ${w.duration_min} min` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={`Hype${(cheers.data ?? []).length ? ` · ${(cheers.data ?? []).length}` : ""}`}>
        {(cheers.data ?? []).length === 0 ? (
          <Empty text={isMe ? "No hype yet — go earn it." : `Be the first to hype ${name}.`} />
        ) : (
          <div className="space-y-2">
            {(cheers.data ?? []).map((c) => {
              const from = c.profiles?.display_name ?? c.profiles?.username ?? "Athlete";
              return (
                <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="text-lg leading-none">{c.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{from}</p>
                    {c.message && <p className="text-sm leading-snug text-muted-foreground">{c.message}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Posts">
        {(posts.data ?? []).length === 0 ? (
          <Empty text="Nothing posted yet." />
        ) : (
          <div className="space-y-4">
            {(posts.data ?? []).map((p) => (
              <FeedPost key={p.id} post={p} uid={uid} />
            ))}
          </div>
        )}
      </Section>
    </AppShell>
  );
}

function CheerBar({ fromId, toId, name }: { fromId: string; toId: string; name: string }) {
  const [emoji, setEmoji] = useState<string>(CHEER_EMOJIS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const send = useMutate(async () => {
    const { error } = await supabase.from("cheers").insert({
      from_user_id: fromId,
      to_user_id: toId,
      emoji,
      message: message.trim() || null,
    });
    if (error) throw error;
  }, ["cheers"]);

  return (
    <div className="mt-4 rounded-3xl border border-accent/30 bg-accent/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Send hype</p>
      <div className="mt-3 flex gap-2">
        {CHEER_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`grid h-10 w-10 place-items-center rounded-full text-lg transition-transform active:scale-90 ${
              emoji === e ? "bg-foreground/10 ring-1 ring-accent" : "bg-background/50"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate(undefined as never, {
            onSuccess: () => {
              setMessage("");
              setSent(true);
              window.setTimeout(() => setSent(false), 2000);
            },
          });
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder={`Hype ${name.split(" ")[0]} up…`}
          className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground/30"
        />
        <button
          type="submit"
          disabled={send.isPending}
          className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {sent && <p className="mt-2 text-[11px] text-accent">Hype sent 🔥</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-background/60 text-accent">{icon}</span>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">{text}</p>;
}
