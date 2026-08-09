import { useState } from "react";
import { BottomSheet } from "@/components/LogSheet";
import { Dumbbell, Clock, Layers, Weight, Trash2, AlertTriangle } from "lucide-react";

export type WorkoutDetail = {
  id: string;
  title: string | null;
  category: string;
  notes: string | null;
  performed_at: string;
  duration_min: number | null;
  workout_sets: Array<{
    id: string;
    exercise: string;
    weight: number | null;
    reps: number | null;
    set_index: number;
  }>;
};

export function WorkoutDetailSheet({
  workout,
  onClose,
  onDelete,
}: {
  workout: WorkoutDetail;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sets = (workout.workout_sets ?? []).slice().sort((a, b) => a.set_index - b.set_index);

  const groups = new Map<string, typeof sets>();
  for (const s of sets) {
    const list = groups.get(s.exercise) ?? [];
    list.push(s);
    groups.set(s.exercise, list);
  }

  const volume = sets.reduce((n, s) => n + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const date = new Date(workout.performed_at);

  return (
    <BottomSheet
      title={workout.title ?? workout.category}
      subtitle={date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      onClose={onClose}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Layers className="h-4 w-4" />} value={String(sets.length)} label="Sets" />
        <Stat icon={<Dumbbell className="h-4 w-4" />} value={String(groups.size)} label="Exercises" />
        <Stat
          icon={volume ? <Weight className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          value={volume ? `${Math.round(volume).toLocaleString()}` : `${workout.duration_min ?? "—"}`}
          label={volume ? "lb volume" : "minutes"}
        />
      </div>

      <div className="mt-4 space-y-3">
        {[...groups.entries()].map(([exercise, list]) => {
          const best = list.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
          return (
            <div key={exercise} className="rounded-3xl border border-border bg-background p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">{exercise}</p>
                <p className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {list.length} {list.length === 1 ? "set" : "sets"}{best ? ` · top ${best} lb` : ""}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                {list.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground">Set {i + 1}</span>
                    <span className="font-medium tracking-tight">
                      {s.weight ? `${s.weight} lb` : "BW"}
                      <span className="text-muted-foreground"> × </span>
                      {s.reps ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {sets.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No sets were logged in this workout.
          </p>
        )}

        {workout.notes && (
          <p className="rounded-3xl border border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">
            {workout.notes}
          </p>
        )}
      </div>

      {onDelete && (
        <div className="mt-5 border-t border-border pt-4">
          {!confirming ? (
            <button
              onClick={() => { setError(null); setConfirming(true); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition active:scale-[0.99]"
            >
              <Trash2 className="h-4 w-4" /> Delete workout
            </button>
          ) : (
            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="flex items-start gap-2 text-sm font-semibold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Delete "{workout.title ?? workout.category}" from{" "}
                {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This permanently removes the session and its {sets.length} logged {sets.length === 1 ? "set" : "sets"}. This can't be undone.
              </p>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  disabled={deleting}
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  Keep it
                </button>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    setError(null);
                    try {
                      await onDelete(workout.id);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Couldn't delete that workout.");
                      setDeleting(false);
                    }
                  }}
                  className="flex-1 rounded-full bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-3 text-center">
      <span className="mx-auto grid h-7 w-7 place-items-center text-muted-foreground">{icon}</span>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
