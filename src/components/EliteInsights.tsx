import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown, Flame, Loader2, Salad, Sparkles } from "lucide-react";
import { getNutritionInsights, getStreakProtection, getWeeklyReport, spendStreakFreeze } from "@/lib/elite-features.functions";
import { useElite } from "@/lib/subscription";
import { fmtNum } from "@/lib/workout-math";

/** ELITE-only analytics: weekly report, 30-day nutrition insights, streak protection. */
export function EliteInsights({ uid }: { uid: string }) {
  const { isElite, loading } = useElite(uid);
  const qc = useQueryClient();

  const report = useQuery({ queryKey: ["weekly-report", uid], queryFn: () => getWeeklyReport(), enabled: isElite });
  const nutrition = useQuery({ queryKey: ["nutrition-insights", uid], queryFn: () => getNutritionInsights(), enabled: isElite });
  const streak = useQuery({ queryKey: ["streak-protection", uid], queryFn: () => getStreakProtection(), enabled: isElite });

  const freeze = useMutation({
    mutationFn: () => spendStreakFreeze({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streak-protection", uid] }),
  });

  if (loading) return <Spin />;

  if (!isElite) {
    return (
      <div className="mt-5 rounded-3xl border border-border bg-surface p-6 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-background">
          <Crown className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Deeper signal, ELITE only</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Weekly training and nutrition reports, 30-day intake analysis and streak protection.
        </p>
        <Link
          to="/elite"
          className="mt-5 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          Unlock with MAXOUT ELITE
        </Link>
      </div>
    );
  }

  const r = report.data;
  const n = nutrition.data;
  const s = streak.data;

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Last week's report
        </h2>
        {report.isLoading && <Spin />}
        {r && (
          <>
            <p className="mt-3 text-sm font-semibold">{r.headline}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {r.weekStart} → {r.weekEnd}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Mini label="Days" value={String(r.daysTrained)} />
              <Mini label="Volume" value={`${fmtNum(r.volume)}`} />
              <Mini label="PRs" value={String(r.prs.length)} />
              <Mini label="Avg kcal" value={r.avgCalories ? fmtNum(r.avgCalories) : "—"} />
              <Mini label="Avg protein" value={r.avgProtein ? `${r.avgProtein}g` : "—"} />
              <Mini label="Logged" value={`${r.daysLogged}/7`} />
            </div>
            <ul className="mt-4 space-y-2">
              {r.focus.map((f) => (
                <li key={f} className="rounded-2xl bg-background px-4 py-3 text-xs text-muted-foreground">
                  {f}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          <Salad className="h-3.5 w-3.5" /> Nutrition insights · 30 days
        </h2>
        {nutrition.isLoading && <Spin />}
        {n && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Mini label="Avg kcal" value={n.avgCalories ? fmtNum(n.avgCalories) : "—"} />
              <Mini label="Avg protein" value={n.avgProtein ? `${n.avgProtein}g` : "—"} />
              <Mini label="Protein hit" value={`${n.proteinHitRate}%`} />
            </div>
            <div className="mt-4 flex h-20 items-end gap-1">
              {n.days.slice(-21).map((d) => {
                const max = Math.max(...n.days.map((x) => x.calories), 1);
                return (
                  <div key={d.day} className="flex-1" title={`${d.day}: ${fmtNum(d.calories)} kcal`}>
                    <div
                      className="w-full rounded-t bg-foreground/80"
                      style={{ height: `${Math.max(4, (d.calories / max) * 100)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <ul className="mt-4 space-y-2">
              {n.tips.map((t) => (
                <li key={t} className="rounded-2xl bg-background px-4 py-3 text-xs text-muted-foreground">
                  {t}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          <Flame className="h-3.5 w-3.5" /> Streak protection
        </h2>
        <p className="mt-3 text-xs text-muted-foreground">
          {s?.available
            ? "You have one streak freeze available this cycle. Use it to cover a missed day."
            : "Freeze used this cycle — a new one unlocks 30 days after your last freeze."}
        </p>
        {!!s?.protectedDays.length && (
          <p className="mt-2 text-[11px] text-muted-foreground">Protected: {s.protectedDays.join(", ")}</p>
        )}
        <button
          onClick={() => freeze.mutate()}
          disabled={!s?.available || freeze.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-xs font-semibold disabled:opacity-40"
        >
          {freeze.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Use freeze for yesterday
        </button>
        {freeze.data?.error && <p className="mt-3 text-[11px] text-destructive">{freeze.data.error}</p>}
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background px-2 py-3">
      <p className="text-base font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Spin() {
  return (
    <div className="mt-6 grid place-items-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
