import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Flame, Trophy, Dumbbell, Droplet, TrendingUp, Plus, Lock, X, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  useProfile, useTodayMeals, useWater, useWorkouts, usePRs, useWeights, useMutate,
} from "@/lib/db";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track — MAXOUT Fitness Dashboard" },
      { name: "description", content: "Log workouts, sets, personal records, meals, water and bodyweight in the MAXOUT app." },
      { property: "og:title", content: "Track — MAXOUT Fitness Dashboard" },
      { property: "og:description", content: "Workouts, PRs, macros and progress — all in one premium tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Track,
});

const CATEGORIES = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Full Body", "Cardio", "Sports", "Custom"];

function Track() {
  const { user } = useSession();
  const uid = user?.id;
  const profile = useProfile(uid);
  const meals = useTodayMeals(uid);
  const water = useWater(uid);
  const workouts = useWorkouts(uid);
  const prs = usePRs(uid);
  const weights = useWeights(uid);

  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | "meal" | "pr" | "weight" | "set">(null);

  const totals = useMemo(() => {
    const list = meals.data ?? [];
    return {
      calories: list.reduce((s, m) => s + (m.calories ?? 0), 0),
      protein: list.reduce((s, m) => s + (m.protein ?? 0), 0),
      carbs: list.reduce((s, m) => s + (m.carbs ?? 0), 0),
      fat: list.reduce((s, m) => s + (m.fat ?? 0), 0),
    };
  }, [meals.data]);

  const weekCount = useMemo(() => {
    const since = Date.now() - 7 * 864e5;
    return (workouts.data ?? []).filter((w) => new Date(w.performed_at).getTime() > since).length;
  }, [workouts.data]);

  const streak = useMemo(() => {
    const days = new Set((workouts.data ?? []).map((w) => new Date(w.performed_at).toDateString()));
    let n = 0;
    const d = new Date();
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [workouts.data]);

  const addMeal = useMutate(async (v: { name: string; meal_type: string; calories: number; protein: number; carbs: number; fat: number }) => {
    const { error } = await supabase.from("meals").insert({ ...v, user_id: uid! });
    if (error) throw error;
    await supabase.from("points_ledger").insert({ user_id: uid!, delta: 5, reason: "Logged a meal" });
  }, ["meals", "profile", "points"]);

  const addPR = useMutate(async (v: { exercise: string; value: number; unit: string }) => {
    const { error } = await supabase.from("personal_records").insert({ ...v, user_id: uid! });
    if (error) throw error;
    await supabase.from("points_ledger").insert({ user_id: uid!, delta: 50, reason: `New PR: ${v.exercise}` });
  }, ["prs", "profile", "points"]);

  const addWeight = useMutate(async (v: { weight: number }) => {
    const { error } = await supabase.from("body_metrics").insert({ weight: v.weight, unit: "lb", user_id: uid! });
    if (error) throw error;
  }, ["weights"]);

  const setWater = useMutate(async (glasses: number) => {
    const { error } = await supabase
      .from("water_logs")
      .upsert({ user_id: uid!, day: new Date().toISOString().slice(0, 10), glasses }, { onConflict: "user_id,day" });
    if (error) throw error;
  }, ["water"]);

  const startWorkout = useMutate(async (category: string) => {
    const { data, error } = await supabase.from("workouts").insert({ user_id: uid!, category, title: `${category} session` }).select().single();
    if (error) throw error;
    setActiveWorkout(data.id);
    await supabase.from("points_ledger").insert({ user_id: uid!, delta: 25, reason: "Completed a workout" });
  }, ["workouts", "profile", "points"]);

  const addSet = useMutate(async (v: { exercise: string; weight: number; reps: number }) => {
    const idx = (workouts.data ?? []).find((w) => w.id === activeWorkout)?.workout_sets?.length ?? 0;
    const { error } = await supabase.from("workout_sets").insert({
      user_id: uid!, workout_id: activeWorkout!, exercise: v.exercise, weight: v.weight, reps: v.reps, set_index: idx + 1,
    });
    if (error) throw error;
  }, ["workouts"]);

  if (!user) return <SignedOut />;

  const glasses = water.data?.glasses ?? 0;
  const goals = {
    calories: profile.data?.goal_calories ?? 2400,
    protein: profile.data?.goal_protein ?? 180,
    carbs: profile.data?.goal_carbs ?? 250,
    fat: profile.data?.goal_fat ?? 80,
  };
  const current = weights.data?.at(-1)?.weight;
  const first = weights.data?.[0]?.weight;
  const live = (workouts.data ?? []).find((w) => w.id === activeWorkout);

  return (
    <AppShell>
      <div className="pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">Today</p>
        <h1 className="mt-1 text-3xl font-semibold">Your Track</h1>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat icon={<Flame className="h-5 w-5 text-accent" />} value={String(streak)} label="Day streak" hint={streak ? "Keep it alive" : "Log a workout"} />
        <BigStat icon={<Dumbbell className="h-5 w-5" />} value={`${weekCount}/5`} label="Workouts this week" hint={weekCount >= 5 ? "Goal hit" : "On pace"} />
      </div>

      {/* Nutrition */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nutrition</h2>
          <button onClick={() => setSheet("meal")} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
            <Plus className="h-3.5 w-3.5" /> Log meal
          </button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <MacroRing label="Cals" value={totals.calories} goal={goals.calories} />
          <MacroRing label="Protein" value={totals.protein} goal={goals.protein} unit="g" />
          <MacroRing label="Carbs" value={totals.carbs} goal={goals.carbs} unit="g" />
          <MacroRing label="Fat" value={totals.fat} goal={goals.fat} unit="g" />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/60 p-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground"><Droplet className="h-4 w-4" /> Water</span>
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setWater.mutate(i + 1 === glasses ? i : i + 1)}
                className={`h-6 w-2 rounded-full transition ${i < glasses ? "bg-foreground" : "bg-secondary"}`} />
            ))}
          </div>
        </div>
        {(meals.data ?? []).length > 0 && (
          <div className="mt-3 divide-y divide-border">
            {meals.data!.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{m.meal_type} · {m.protein}p / {m.carbs}c / {m.fat}f</p>
                </div>
                <span className="font-semibold">{m.calories}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Workout */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workout</h2>
          {live && (
            <button onClick={() => setSheet("set")} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Plus className="h-3.5 w-3.5" /> Add set
            </button>
          )}
        </div>
        {live ? (
          <>
            <p className="mt-1 text-xs text-accent">Live · {live.category}</p>
            <div className="mt-3 divide-y divide-border">
              {(live.workout_sets ?? []).sort((a, b) => a.set_index - b.set_index).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{s.exercise}</span>
                  <span className="text-muted-foreground">{s.weight} lb × {s.reps}</span>
                </div>
              ))}
              {(live.workout_sets ?? []).length === 0 && <p className="py-3 text-xs text-muted-foreground">No sets yet — add your first.</p>}
            </div>
            <button onClick={() => setActiveWorkout(null)} className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold">
              <Check className="h-3.5 w-3.5" /> Finish workout
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Pick a category to start logging.</p>
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => startWorkout.mutate(c)}
                  className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">{c}</button>
              ))}
            </div>
          </>
        )}
        {(workouts.data ?? []).length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recent</p>
            {workouts.data!.slice(0, 4).map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span>{w.title ?? w.category}</span>
                <span className="text-xs text-muted-foreground">
                  {(w.workout_sets ?? []).length} sets · {new Date(w.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PRs */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Personal Records</h2>
          <button onClick={() => setSheet("pr")} className="inline-flex items-center gap-1 text-accent"><Trophy className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 divide-y divide-border">
          {(prs.data ?? []).map((pr) => (
            <div key={pr.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{pr.exercise}</p>
                <p className="text-xs text-muted-foreground">{new Date(pr.achieved_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
              <span className="text-lg font-semibold tracking-tight">{pr.value} {pr.unit}</span>
            </div>
          ))}
          {(prs.data ?? []).length === 0 && <p className="py-3 text-xs text-muted-foreground">No PRs yet. Tap the trophy to log one.</p>}
        </div>
      </section>

      {/* Weight */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Weight</h2>
          <button onClick={() => setSheet("weight")}><TrendingUp className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{current ?? "—"}</span>
          <span className="text-sm text-muted-foreground">lb</span>
          {current && first && current !== first && (
            <span className="ml-2 text-xs text-accent">{current > first ? "+" : "−"}{Math.abs(current - first).toFixed(1)} since start</span>
          )}
        </div>
        {(weights.data ?? []).length > 1
          ? <MiniChart points={weights.data!.map((w) => w.weight)} />
          : <p className="mt-3 text-xs text-muted-foreground">Log two entries to see your trend.</p>}
      </section>

      {sheet === "meal" && (
        <Sheet title="Log meal" onClose={() => setSheet(null)} fields={[
          { key: "name", label: "Meal", type: "text" },
          { key: "meal_type", label: "Type (breakfast/lunch/dinner/snack)", type: "text", initial: "lunch" },
          { key: "calories", label: "Calories", type: "number" },
          { key: "protein", label: "Protein (g)", type: "number" },
          { key: "carbs", label: "Carbs (g)", type: "number" },
          { key: "fat", label: "Fat (g)", type: "number" },
        ]} onSubmit={(v) => { addMeal.mutate(v as never); setSheet(null); }} />
      )}
      {sheet === "pr" && (
        <Sheet title="New personal record" onClose={() => setSheet(null)} fields={[
          { key: "exercise", label: "Exercise", type: "text" },
          { key: "value", label: "Value", type: "number" },
          { key: "unit", label: "Unit", type: "text", initial: "lb" },
        ]} onSubmit={(v) => { addPR.mutate(v as never); setSheet(null); }} />
      )}
      {sheet === "weight" && (
        <Sheet title="Log bodyweight" onClose={() => setSheet(null)} fields={[{ key: "weight", label: "Weight (lb)", type: "number" }]}
          onSubmit={(v) => { addWeight.mutate(v as never); setSheet(null); }} />
      )}
      {sheet === "set" && (
        <Sheet title="Add set" onClose={() => setSheet(null)} fields={[
          { key: "exercise", label: "Exercise", type: "text" },
          { key: "weight", label: "Weight (lb)", type: "number" },
          { key: "reps", label: "Reps", type: "number" },
        ]} onSubmit={(v) => { addSet.mutate(v as never); setSheet(null); }} />
      )}
    </AppShell>
  );
}

function SignedOut() {
  return (
    <AppShell>
      <div className="pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">Today</p>
        <h1 className="mt-1 text-3xl font-semibold">Your Track</h1>
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-surface p-6 text-center">
        <Lock className="mx-auto h-6 w-6 text-accent" />
        <h2 className="mt-3 text-lg font-semibold">Unlock your tracker</h2>
        <p className="mt-1 text-sm text-muted-foreground">Workouts, PRs, macros, water and bodyweight — private to you and synced across devices.</p>
        <Link to="/auth" className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
          Create your free account
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 opacity-40">
        <BigStat icon={<Flame className="h-5 w-5 text-accent" />} value="12" label="Day streak" hint="Preview" />
        <BigStat icon={<Dumbbell className="h-5 w-5" />} value="4/5" label="Workouts this week" hint="Preview" />
      </div>
    </AppShell>
  );
}

type Field = { key: string; label: string; type: "text" | "number"; initial?: string };

function Sheet({ title, fields, onSubmit, onClose }: { title: string; fields: Field[]; onSubmit: (v: Record<string, string | number>) => void; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])),
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? Number(values[f.key] || 0) : (values[f.key] ?? "")])));
          }}
        >
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs text-muted-foreground">{f.label}</span>
              <input
                required
                type={f.type}
                inputMode={f.type === "number" ? "decimal" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
              />
            </label>
          ))}
          <button type="submit" className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">Save</button>
        </form>
      </div>
    </div>
  );
}

function BigStat({ icon, value, label, hint }: { icon: React.ReactNode; value: string; label: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      {icon}
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-[11px] text-accent">{hint}</div>
    </div>
  );
}

function MacroRing({ label, value, goal, unit = "" }: { label: string; value: number; goal: number; unit?: string }) {
  const pct = Math.min(100, Math.round((value / (goal || 1)) * 100));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <div className="relative mx-auto h-14 w-14">
        <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="4" />
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-foreground)" strokeWidth="4"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold">{pct}%</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium">{Math.round(value)}{unit}<span className="text-muted-foreground">/{goal}{unit}</span></div>
    </div>
  );
}

function MiniChart({ points }: { points: number[] }) {
  const min = Math.min(...points) - 0.5;
  const max = Math.max(...points) + 0.5;
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * 100;
    const y = 100 - ((p - min) / (max - min)) * 100;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-20 w-full">
      <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#g)" opacity="0.4" />
      <path d={path} fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" />
      <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-foreground)" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
    </svg>
  );
}
