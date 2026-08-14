import { useEffect, useMemo, useState } from "react";
import { Trophy, Flame, Dumbbell, Timer, X, BookmarkPlus, Share2, Check } from "lucide-react";
import type { DetectedPR } from "@/lib/pr";
import { fmtNum, totalVolume, type SetRow } from "@/lib/workout-math";
import { groupSetCounts } from "@/lib/muscle-groups";

/**
 * Post-workout summary. Rendered once, right after a session is finished and
 * PR detection has run — the PRs shown here are the rows the database
 * actually accepted, never a client-side guess.
 */
export function WorkoutComplete({
  title,
  durationMin,
  sets,
  prs,
  pointsEarned,
  onSaveTemplate,
  onShare,
  onClose,
}: {
  title: string;
  durationMin: number;
  sets: SetRow[];
  prs: DetectedPR[];
  pointsEarned: number;
  onSaveTemplate: () => Promise<void> | void;
  onShare: () => void;
  onClose: () => void;
}) {
  const [savedTemplate, setSavedTemplate] = useState(false);
  const volume = useMemo(() => totalVolume(sets), [sets]);
  const groups = useMemo(() => groupSetCounts(sets).slice(0, 4), [sets]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close summary"
            className="grid h-9 w-9 place-items-center rounded-full border border-border active:scale-90 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">Workout complete</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight">{title}</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat icon={<Timer className="h-4 w-4" />} value={`${Math.max(1, Math.round(durationMin))}m`} label="Duration" />
          <Stat icon={<Dumbbell className="h-4 w-4" />} value={String(sets.length)} label="Sets" />
          <Stat icon={<Flame className="h-4 w-4" />} value={fmtNum(volume)} label="Volume lb" />
        </div>

        {prs.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-foreground/25 bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Trophy className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold">
                {prs.length} new personal record{prs.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-border">
              {prs.map((pr) => (
                <div key={pr.id + pr.kind} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pr.exercise}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pr.kind === "weight" ? "Heaviest set" : "Estimated 1RM"}
                      {pr.previous ? ` · was ${fmtNum(pr.previous, 1)} lb` : " · first record"}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold tabular-nums tracking-tight">
                    {fmtNum(pr.value, 1)} <span className="text-xs font-normal text-muted-foreground">lb</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {groups.length > 0 && (
          <section className="mt-4 rounded-3xl border border-border bg-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Muscles trained</p>
            <div className="mt-3 space-y-2">
              {groups.map((g) => {
                const max = groups[0]!.sets || 1;
                return (
                  <div key={g.group} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs">{g.group}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-foreground" style={{ width: `${(g.sets / max) * 100}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{g.sets}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pointsEarned > 0 && (
          <p className="mt-4 rounded-3xl border border-border bg-surface px-5 py-4 text-sm">
            <span className="font-semibold">+{pointsEarned} MAXOUT Points</span>
            <span className="text-muted-foreground"> added to your balance</span>
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={async () => { await onSaveTemplate(); setSavedTemplate(true); }}
            disabled={savedTemplate}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60"
          >
            {savedTemplate ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
            {savedTemplate ? "Saved as template" : "Save as template"}
          </button>
          <button onClick={onShare}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-4 text-sm font-semibold active:scale-[0.98] transition">
            <Share2 className="h-4 w-4" /> Share to The Floor
          </button>
          <button onClick={onClose}
            className="flex w-full items-center justify-center rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <span className="text-muted-foreground">{icon}</span>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}
