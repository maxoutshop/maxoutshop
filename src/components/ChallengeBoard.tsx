import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Trophy, Users, Check, ChevronRight, Crown } from "lucide-react";
import {
  useChallengeBoard, useLeaderboard, joinChallenge, leaveChallenge,
  metricUnit, daysRemaining, type ChallengeRow, type Participation,
} from "@/lib/challenges";
import { useInvalidate } from "@/lib/db";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "@/components/Media";
import { fmtNum } from "@/lib/workout-math";

/**
 * Challenges 2.0. Progress is recomputed server-side from real training data
 * every time this board loads, so a challenge bar can never drift from the
 * workouts behind it.
 */
export function ChallengeBoard({ uid }: { uid?: string }) {
  const board = useChallengeBoard(uid);
  const invalidate = useInvalidate();
  const [open, setOpen] = useState<string | null>(null);

  if (!uid) {
    return (
      <div className="mt-5 rounded-3xl border border-border bg-surface p-6 text-center">
        <Trophy className="mx-auto h-6 w-6 text-accent" />
        <p className="mt-3 text-sm text-muted-foreground">Sign in to join challenges and climb the leaderboard.</p>
        <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
          Join MAXOUT
        </Link>
      </div>
    );
  }

  if (board.isLoading) {
    return <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-surface" />)}</div>;
  }

  const mine = new Map((board.data?.mine ?? []).map((m) => [m.challenge_id, m]));
  const list = board.data?.challenges ?? [];
  const active = list.filter((c) => c.active);
  const past = list.filter((c) => !c.active);

  return (
    <div className="mt-5 space-y-3">
      {active.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          participation={mine.get(c.id) ?? null}
          expanded={open === c.id}
          onExpand={() => setOpen((o) => (o === c.id ? null : c.id))}
          onJoin={async () => { await joinChallenge(uid, c.id); invalidate("challenge-board", "my-challenges"); }}
          onLeave={async () => { await leaveChallenge(uid, c.id); invalidate("challenge-board", "my-challenges"); }}
        />
      ))}

      {active.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No live challenges right now. New ones drop with every release.
        </p>
      )}

      {past.length > 0 && (
        <>
          <p className="pt-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Finished</p>
          {past.map((c) => (
            <ChallengeCard
              key={c.id} challenge={c} participation={mine.get(c.id) ?? null}
              expanded={open === c.id} onExpand={() => setOpen((o) => (o === c.id ? null : c.id))}
              onJoin={async () => {}} onLeave={async () => {}}
            />
          ))}
        </>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge: c, participation, expanded, onExpand, onJoin, onLeave,
}: {
  challenge: ChallengeRow;
  participation: Participation | null;
  expanded: boolean;
  onExpand: () => void;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const joined = !!participation;
  const progress = participation?.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / (c.target_value || 1)) * 100));
  const left = daysRemaining(c.ends_on);
  const done = !!participation?.completed_at;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface">
      {c.image_url && <img src={c.image_url} alt="" className="h-32 w-full object-cover" loading="lazy" />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
              {done ? <><Check className="h-3 w-3" /> Complete</> : <><Flame className="h-3 w-3" /> {c.active ? "Live" : "Closed"}</>}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-tight">{c.title}</h3>
            {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
          </div>
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-semibold">
            +{c.reward_points} pts
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {c.goal_label ?? `${fmtNum(c.target_value)} ${metricUnit(c.metric)}`}
            </span>
            <span className="tabular-nums font-semibold">
              {fmtNum(progress)} / {fmtNum(c.target_value)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-accent" : "bg-foreground"}`} style={{ width: `${pct}%` }} />
          </div>
          {left !== null && <p className="mt-2 text-[11px] text-muted-foreground">{left} days left</p>}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {c.active && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); try { joined ? await onLeave() : await onJoin(); } finally { setBusy(false); } }}
              className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                joined ? "border border-border text-muted-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {joined ? "Leave challenge" : "Join challenge"}
            </button>
          )}
          <button onClick={onExpand}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition">
            <Users className="h-3.5 w-3.5" /> Leaderboard
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>

        {expanded && <Leaderboard challengeId={c.id} metric={c.metric} />}
      </div>
    </section>
  );
}

function Leaderboard({ challengeId, metric }: { challengeId: string; metric: string }) {
  const board = useLeaderboard(challengeId);

  if (board.isLoading) return <div className="mt-4 h-24 animate-pulse rounded-2xl bg-background" />;
  const rows = board.data ?? [];
  if (!rows.length) return <p className="mt-4 text-xs text-muted-foreground">No athletes yet. Be first on the board.</p>;

  return (
    <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-background">
      {rows.slice(0, 20).map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
          <span className={`w-6 shrink-0 text-center text-xs font-bold tabular-nums ${r.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>
            {r.rank}
          </span>
          <Avatar src={r.profile?.avatar_url} name={r.profile?.display_name ?? r.profile?.username} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium">
              {r.profile?.display_name ?? r.profile?.username ?? "Athlete"}
              {r.profile?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
              {r.profile?.is_elite && <Crown className="h-3 w-3 text-accent" />}
            </p>
            {r.profile?.username && <p className="truncate text-[11px] text-muted-foreground">@{r.profile.username}</p>}
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {fmtNum(r.progress)} <span className="text-[10px] font-normal text-muted-foreground">{metricUnit(metric)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
