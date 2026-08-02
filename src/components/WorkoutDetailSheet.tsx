import { BottomSheet } from "@/components/LogSheet";
import { Dumbbell, Clock, Layers, Weight } from "lucide-react";

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

export function WorkoutDetailSheet({ workout, onClose }: { workout: WorkoutDetail; onClose: () => void }) {
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
