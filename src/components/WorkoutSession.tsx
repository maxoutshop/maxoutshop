import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Check, Plus, Minus, Timer, Trash2, ChevronDown, ChevronUp, Dumbbell, Search,
} from "lucide-react";
import { EXERCISE_LIBRARY, type TemplateExercise } from "@/lib/workout-templates";

export type LiveSet = {
  id: string;
  exercise: string;
  weight: number | null;
  reps: number | null;
  set_index: number;
};

const WEIGHT_JUMPS = [2.5, 5, 10, 25, 45];
const REST_OPTIONS = [60, 90, 120, 180];

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function WorkoutSession({
  title, category, startedAt, sets, plan: initialPlan, onAddSet, onDeleteSet, onFinish, onClose,
}: {
  title: string;
  category: string;
  startedAt: string;
  sets: LiveSet[];
  plan: TemplateExercise[];
  onAddSet: (v: { exercise: string; weight: number; reps: number }) => void;
  onDeleteSet: (id: string) => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<TemplateExercise[]>(initialPlan);
  const [openEx, setOpenEx] = useState<string | null>(initialPlan[0]?.name ?? null);
  const [adding, setAdding] = useState(false);
  const [rest, setRest] = useState<number | null>(null);
  const [restLen, setRestLen] = useState(90);
  const elapsed = useElapsed(startedAt);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Merge any logged exercises that aren't in the plan
  const exercises = useMemo(() => {
    const names = new Set(plan.map((p) => p.name));
    const extras = Array.from(new Set(sets.map((s) => s.exercise))).filter((n) => !names.has(n));
    return [...plan, ...extras.map((name) => ({ name, sets: 0, reps: "" }))];
  }, [plan, sets]);

  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) { setRest(null); return; }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  const totalVolume = sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface/80 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="Minimize workout" className="grid h-9 w-9 place-items-center rounded-full border border-border active:scale-90 transition">
            <ChevronDown className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Live · {category}</p>
            <p className="text-sm font-semibold tracking-tight">{title}</p>
          </div>
          <button onClick={onFinish} aria-label="Finish workout" className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background active:scale-90 transition">
            <Check className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-background py-2 text-center">
          <Metric label="Time" value={elapsed} />
          <Metric label="Sets" value={String(sets.length)} />
          <Metric label="Volume" value={`${Math.round(totalVolume).toLocaleString()}`} />
        </div>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-40 pt-4">
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.name}
              ex={ex}
              sets={sets.filter((s) => s.exercise === ex.name)}
              open={openEx === ex.name}
              onToggle={() => setOpenEx((o) => (o === ex.name ? null : ex.name))}
              onLog={(v) => { onAddSet({ exercise: ex.name, ...v }); setRest(restLen); }}
              onDeleteSet={onDeleteSet}
              onRemove={() => setPlan((p) => p.filter((x) => x.name !== ex.name))}
            />
          ))}
        </div>

        {adding ? (
          <AddExercise
            existing={exercises.map((e) => e.name)}
            onCancel={() => setAdding(false)}
            onAdd={(name) => {
              setPlan((p) => [...p, { name, sets: 3, reps: "8–12" }]);
              setOpenEx(name);
              setAdding(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" /> Add exercise
          </button>
        )}

        <button
          onClick={onFinish}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition"
        >
          <Check className="h-4 w-4" /> Finish workout
        </button>
      </div>

      {/* Rest timer */}
      {rest !== null && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 border-t border-border bg-surface/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Rest</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
              </p>
            </div>
            <div className="flex gap-1.5">
              {REST_OPTIONS.map((r) => (
                <button key={r} onClick={() => { setRestLen(r); setRest(r); }}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${restLen === r ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
                  {r}s
                </button>
              ))}
            </div>
            <button onClick={() => setRest(null)} aria-label="Skip rest" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full bg-accent transition-all duration-1000 ease-linear" style={{ width: `${(rest / restLen) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

function ExerciseCard({
  ex, sets, open, onToggle, onLog, onDeleteSet, onRemove,
}: {
  ex: TemplateExercise;
  sets: LiveSet[];
  open: boolean;
  onToggle: () => void;
  onLog: (v: { weight: number; reps: number }) => void;
  onDeleteSet: (id: string) => void;
  onRemove: () => void;
}) {
  const last = sets.at(-1);
  const [weight, setWeight] = useState<number>(last?.weight ?? 135);
  const [reps, setReps] = useState<number>(last?.reps ?? 8);
  const synced = useRef(false);

  useEffect(() => {
    if (last && !synced.current) {
      setWeight(last.weight ?? 135);
      setReps(last.reps ?? 8);
    }
  }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = sets.length;
  const target = ex.sets || 0;

  return (
    <section className={`overflow-hidden rounded-3xl border bg-surface transition ${open ? "border-foreground/25" : "border-border"}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{ex.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {target ? `${target} × ${ex.reps}` : "Freestyle"}{done > 0 ? ` · ${done} logged` : ""}
          </p>
        </div>
        {target > 0 && (
          <div className="flex gap-1">
            {Array.from({ length: target }).map((_, i) => (
              <span key={i} className={`h-1.5 w-4 rounded-full ${i < done ? "bg-accent" : "bg-border"}`} />
            ))}
          </div>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {sets.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {sets.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-background px-4 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 text-lg font-semibold tabular-nums tracking-tight">
                    {fmt(s.weight ?? 0)} <span className="text-xs font-normal text-muted-foreground">lb</span>
                    <span className="mx-2 text-muted-foreground">×</span>
                    {s.reps} <span className="text-xs font-normal text-muted-foreground">reps</span>
                  </span>
                  <button onClick={() => onDeleteSet(s.id)} aria-label="Delete set" className="active:scale-90 transition">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Big weight display */}
          <div className="rounded-3xl border border-border bg-background p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Weight</p>
            <div className="mt-1 flex items-center justify-center gap-4">
              <button onClick={() => setWeight((w) => Math.max(0, w - 5))} aria-label="Less weight"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border active:scale-90 transition">
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-baseline justify-center gap-1">
                <input
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => { synced.current = true; setWeight(Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0)); }}
                  className="w-[4.5ch] bg-transparent text-center text-6xl font-semibold tabular-nums tracking-tighter outline-none"
                />
                <span className="text-sm text-muted-foreground">lb</span>
              </div>
              <button onClick={() => setWeight((w) => w + 5)} aria-label="More weight"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border active:scale-90 transition">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {WEIGHT_JUMPS.map((j) => (
                <button key={j} onClick={() => { synced.current = true; setWeight((w) => w + j); }}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground active:scale-95 transition">
                  +{fmt(j)}
                </button>
              ))}
            </div>
          </div>

          {/* Reps */}
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-border bg-background px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Reps</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{reps}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReps((r) => Math.max(1, r - 1))} aria-label="Fewer reps"
                className="grid h-11 w-11 place-items-center rounded-full border border-border active:scale-90 transition">
                <Minus className="h-4 w-4" />
              </button>
              <button onClick={() => setReps((r) => r + 1)} aria-label="More reps"
                className="grid h-11 w-11 place-items-center rounded-full border border-border active:scale-90 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => onLog({ weight, reps })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-4 text-sm font-semibold text-background active:scale-[0.98] transition"
          >
            <Dumbbell className="h-4 w-4" /> Log set {done + 1}
          </button>

          <button onClick={onRemove} className="mt-2 w-full py-2 text-[11px] text-muted-foreground">
            Remove exercise
          </button>
        </div>
      )}
    </section>
  );
}

function AddExercise({ existing, onAdd, onCancel }: { existing: string[]; onAdd: (n: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const matches = EXERCISE_LIBRARY.filter(
    (e) => !existing.includes(e) && e.toLowerCase().includes(q.toLowerCase()),
  ).slice(0, 8);
  return (
    <div className="mt-3 rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or type a lift"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="mt-2 space-y-1">
        {matches.map((m) => (
          <button key={m} onClick={() => onAdd(m)} className="w-full rounded-2xl px-3 py-2.5 text-left text-sm active:bg-background">
            {m}
          </button>
        ))}
        {q.trim() && !matches.some((m) => m.toLowerCase() === q.trim().toLowerCase()) && (
          <button onClick={() => onAdd(q.trim())} className="w-full rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-accent">
            Add "{q.trim()}"
          </button>
        )}
      </div>
      <button onClick={onCancel} className="mt-2 w-full py-2 text-xs text-muted-foreground">Cancel</button>
    </div>
  );
}
