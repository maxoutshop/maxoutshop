import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Dumbbell, Flame, TrendingUp, Trophy, Scale, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/auth";
import {
  RANGE_LABELS, useAnalyticsWorkouts, useAnalyticsWeights, useAnalyticsPRs,
  useExerciseHistory, useLoggedExercises, type Range,
} from "@/lib/analytics";
import { totalVolume, fmtNum, streakFromDates, bestEstimated1RM } from "@/lib/workout-math";
import { muscleGroupFor } from "@/lib/muscle-groups";
import { EliteInsights } from "@/components/EliteInsights";

const TITLE = "Progress — MAXOUT";
const DESC = "Training volume, streaks, bodyweight trend and strength gains across your MAXOUT history.";

export const Route = createFileRoute("/progress")({
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
  component: Progress,
});

const RANGES: Range[] = ["30d", "90d", "6m", "1y", "all"];

function Progress() {
  const { user, loading } = useSession();
  const uid = user?.id;
  const [range, setRange] = useState<Range>("90d");
  const [tab, setTab] = useState<"overview" | "strength" | "body" | "elite">("overview");

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/track" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Track
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-xs text-muted-foreground">Every rep you've logged, turned into signal.</p>

        {loading && <div className="mt-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

        {!loading && !uid && (
          <Link to="/auth" className="mt-6 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground">
            Sign in to see your progress
          </Link>
        )}

        {uid && (
          <>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    range === r ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1 rounded-full border border-border p-1">
              {(["overview", "strength", "body", "elite"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full py-2 text-xs font-semibold capitalize transition ${
                    tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && <Overview uid={uid} range={range} />}
            {tab === "strength" && <Strength uid={uid} range={range} />}
            {tab === "body" && <Body uid={uid} range={range} />}
            {tab === "elite" && <EliteInsights uid={uid} />}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Overview({ uid, range }: { uid: string; range: Range }) {
  const workouts = useAnalyticsWorkouts(uid, range);
  const prs = useAnalyticsPRs(uid, range);

  const stats = useMemo(() => {
    const rows = workouts.data ?? [];
    const sets = rows.flatMap((w) => w.workout_sets ?? []);
    const streak = streakFromDates(rows.map((w) => w.performed_at));
    const groups = new Map<string, number>();
    for (const s of sets) {
      const g = muscleGroupFor(s.exercise);
      groups.set(g, (groups.get(g) ?? 0) + 1);
    }
    const weeks = new Map<string, number>();
    for (const w of rows) {
      const d = new Date(w.performed_at);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toISOString().slice(0, 10);
      weeks.set(key, (weeks.get(key) ?? 0) + totalVolume((w.workout_sets ?? []) as never));
    }
    return {
      workouts: rows.length,
      sets: sets.length,
      volume: totalVolume(sets as never),
      minutes: rows.reduce((a, w) => a + (w.duration_min ?? 0), 0),
      streak,
      groups: [...groups.entries()].sort((a, b) => b[1] - a[1]),
      weekly: [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12),
    };
  }, [workouts.data]);

  if (workouts.isLoading) return <Skeleton />;
  if (!stats.workouts) return <Empty text="No workouts in this range yet. Start one from Track." />;

  const maxWeek = Math.max(...stats.weekly.map((w) => w[1]), 1);

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Dumbbell className="h-4 w-4" />} label="Workouts" value={String(stats.workouts)} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Volume" value={`${fmtNum(stats.volume)} lb`} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Current streak" value={`${stats.streak.current}d`} sub={`Best ${stats.streak.longest}d`} />
        <Stat icon={<Trophy className="h-4 w-4" />} label="PRs" value={String((prs.data ?? []).length)} />
      </div>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Weekly volume</h2>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {stats.weekly.map(([week, v]) => (
            <div key={week} className="flex-1" title={`${week}: ${fmtNum(v)} lb`}>
              <div className="w-full rounded-t bg-foreground/80 transition-all" style={{ height: `${Math.max(4, (v / maxWeek) * 100)}%` }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Last {stats.weekly.length} weeks · peak {fmtNum(maxWeek)} lb</p>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Muscle split</h2>
        <div className="mt-4 space-y-2.5">
          {stats.groups.map(([g, count]) => {
            const pct = Math.round((count / stats.sets) * 100);
            return (
              <div key={g}>
                <div className="flex justify-between text-xs">
                  <span className="capitalize">{g}</span>
                  <span className="tabular-nums text-muted-foreground">{pct}% · {count} sets</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(prs.data ?? []).length > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Recent records</h2>
          <div className="mt-3 divide-y divide-border">
            {(prs.data ?? []).slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate">{p.exercise}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {fmtNum(Number(p.value))} {p.unit}{p.reps ? ` × ${p.reps}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Strength({ uid, range }: { uid: string; range: Range }) {
  const exercises = useLoggedExercises(uid);
  const [exercise, setExercise] = useState<string>("");
  const active = exercise || (exercises.data ?? [])[0] || "";
  const history = useExerciseHistory(uid, active, range);

  if (exercises.isLoading) return <Skeleton />;
  if (!(exercises.data ?? []).length) return <Empty text="Log a few sets and your strength curve shows up here." />;

  const sets = history.data ?? [];
  const byDay = new Map<string, typeof sets>();
  for (const s of sets) {
    const day = s.workouts.performed_at.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  const points = [...byDay.entries()]
    .map(([day, rows]) => ({ day, e1rm: bestEstimated1RM(rows as never).value }))
    .filter((p) => p.e1rm > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
  const max = Math.max(...points.map((p) => p.e1rm), 1);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(exercises.data ?? []).slice(0, 30).map((ex) => (
          <button key={ex} onClick={() => setExercise(ex)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active === ex ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
            {ex}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">{active}</h2>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Estimated 1RM trend</p>
        {history.isLoading ? (
          <div className="mt-6 h-28 animate-pulse rounded-2xl bg-background" />
        ) : points.length < 2 ? (
          <p className="mt-4 text-sm text-muted-foreground">Log this lift on another day to see the trend.</p>
        ) : (
          <>
            <div className="mt-5 flex h-32 items-end gap-1">
              {points.slice(-24).map((p) => (
                <div key={p.day} className="flex-1" title={`${p.day}: ${fmtNum(p.e1rm)} lb`}>
                  <div className="w-full rounded-t bg-accent" style={{ height: `${Math.max(6, (p.e1rm / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{points[0]!.day}</span>
              <span className="font-semibold text-foreground">Best {fmtNum(max)} lb e1RM</span>
              <span>{points[points.length - 1]!.day}</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Body({ uid, range }: { uid: string; range: Range }) {
  const weights = useAnalyticsWeights(uid, range);
  if (weights.isLoading) return <Skeleton />;
  const rows = weights.data ?? [];
  if (rows.length < 1) return <Empty text="Log your bodyweight on Track to build the trend." />;

  const vals = rows.map((r) => Number(r.weight));
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const first = vals[0]!, last = vals[vals.length - 1]!;
  const delta = last - first;

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Scale className="h-4 w-4" />} label="Current" value={`${fmtNum(last, 1)}`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Change" value={`${delta >= 0 ? "+" : ""}${fmtNum(delta, 1)}`} />
        <Stat icon={<Scale className="h-4 w-4" />} label="Logs" value={String(rows.length)} />
      </div>
      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Bodyweight</h2>
        <div className="mt-5 flex h-32 items-end gap-1">
          {rows.slice(-40).map((r, i) => (
            <div key={`${r.logged_at}-${i}`} className="flex-1" title={`${r.logged_at}: ${r.weight}${r.unit}`}>
              <div className="w-full rounded-t bg-foreground/70" style={{ height: `${20 + ((Number(r.weight) - min) / span) * 80}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
          <span>{rows[0]!.logged_at}</span><span>{rows[rows.length - 1]!.logged_at}</span>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <span className="text-muted-foreground">{icon}</span>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const Skeleton = () => <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface" />)}</div>;
const Empty = ({ text }: { text: string }) => (
  <p className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>
);
