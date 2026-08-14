import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Flame, Trophy, Dumbbell, Droplet, TrendingUp, Plus, Lock, Utensils, Scale, Target, ChevronRight, Brain } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  useProfile, useRecentMeals, useWater, useWorkouts, usePRs, useWeights, useMutate,
  deleteWorkout, useInvalidate,
} from "@/lib/db";
import { useElite } from "@/lib/subscription";
import { NutritionPanel } from "@/components/NutritionPanel";
import { BottomSheet, MealSheet, Stepper, BigInput, PrimaryButton, type MealDraft } from "@/components/LogSheet";
import { GoalsSheet } from "@/components/GoalsSheet";
import { TrainerSheet } from "@/components/TrainerSheet";
import { WorkoutSession } from "@/components/WorkoutSession";
import { WorkoutDetailSheet, type WorkoutDetail } from "@/components/WorkoutDetailSheet";
import { RemindersCard } from "@/components/RemindersCard";
import { WORKOUT_TEMPLATES, GROWTH_TIPS, type TemplateExercise } from "@/lib/workout-templates";
import { WorkoutComplete } from "@/components/WorkoutComplete";
import { SavedMealsSheet } from "@/components/SavedMealsSheet";
import { detectPRs, claimPoints, type DetectedPR } from "@/lib/pr";
import { fetchPointsRules } from "@/lib/rewards";
import { useUserTemplates, saveTemplate, deleteTemplate, lastWorkoutPlan, templateToPlan } from "@/lib/templates";
import {
  copyDayMeals, useSavedMeals, saveMealTemplate, logSavedMeal,
  toggleFavoriteMeal, deleteSavedMeal, type SavedMeal,
} from "@/lib/saved-meals";
import { syncChallengeProgress } from "@/lib/challenges";
import { LineChart, Sparkles, Gift, Bookmark, CopyPlus } from "lucide-react";




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

const COMMON_LIFTS = ["Bench press", "Back squat", "Deadlift", "Overhead press", "Barbell row", "Pull-up", "Incline dumbbell press", "Romanian deadlift"];


function Track() {
  const { user, loading: sessionLoading } = useSession();
  const uid = user?.id;
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const { isElite } = useElite(uid);
  const profile = useProfile(uid);

  const meals = useRecentMeals(uid);
  const water = useWater(uid);
  const workouts = useWorkouts(uid);
  const prs = usePRs(uid);
  const weights = useWeights(uid);

  const templates = useUserTemplates(uid);
  const savedMeals = useSavedMeals(uid);

  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [plan, setPlan] = useState<TemplateExercise[]>([]);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [summary, setSummary] = useState<null | {
    workoutId: string; title: string; category: string; durationMin: number;
    sets: Array<{ exercise: string; weight: number | null; reps: number | null }>;
    prs: DetectedPR[]; points: number;
  }>(null);
  const [sheet, setSheet] = useState<
    null | "quick" | "meal" | "pr" | "weight" | "workout" | "goals" | "trainer" | "saved-meals"
  >(null);




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

  const addMeals = useMutate(async (v: { items: MealDraft[]; mealType: string }) => {
    const rows = v.items.map((i) => ({
      user_id: uid!, name: i.name, meal_type: v.mealType,
      calories: Math.round(i.calories), protein: Math.round(i.protein), carbs: Math.round(i.carbs), fat: Math.round(i.fat),
    }));
    const { error } = await supabase.from("meals").insert(rows);
    if (error) throw error;
  }, ["meals", "profile"]);


  const deleteMeal = useMutate(async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) throw error;
  }, ["meals"]);

  const addPR = useMutate(async (v: { exercise: string; value: number; unit: string }) => {
    const { error } = await supabase.from("personal_records").insert({ ...v, user_id: uid! });
    if (error) throw error;
  }, ["prs", "profile"]);

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

  const startWorkout = useMutate(async (v: { category: string; title: string; exercises: TemplateExercise[] }) => {
    const { data, error } = await supabase.from("workouts").insert({ user_id: uid!, category: v.category, title: v.title }).select().single();
    if (error) throw error;
    setPlan(v.exercises);
    setActiveWorkout(data.id);
    setSessionOpen(true);
  }, ["workouts", "profile"]);

  const addSet = useMutate(async (v: { exercise: string; weight: number; reps: number }) => {
    const idx = (workouts.data ?? []).find((w) => w.id === activeWorkout)?.workout_sets?.length ?? 0;
    const { error } = await supabase.from("workout_sets").insert({
      user_id: uid!, workout_id: activeWorkout!, exercise: v.exercise, weight: v.weight, reps: v.reps, set_index: idx + 1,
    });
    if (error) throw error;
  }, ["workouts"]);

  const deleteSet = useMutate(async (id: string) => {
    const { error } = await supabase.from("workout_sets").delete().eq("id", id);
    if (error) throw error;
  }, ["workouts"]);

  const saveGoals = useMutate(async (g: { calories: number; protein: number; carbs: number; fat: number; weight: number | null }) => {
    const { error } = await supabase.from("profiles").update({
      goal_calories: Math.round(g.calories),
      goal_protein: Math.round(g.protein),
      goal_carbs: Math.round(g.carbs),
      goal_fat: Math.round(g.fat),
      goal_weight: g.weight,
    }).eq("id", uid!);
    if (error) throw error;
  }, ["profile"]);

  if (sessionLoading) return <SessionLoading />;
  if (!user) return <SignedOut />;

  const glasses = water.data?.glasses ?? 0;
  const goals = {
    calories: profile.data?.goal_calories ?? 2400,
    protein: profile.data?.goal_protein ?? 180,
    carbs: profile.data?.goal_carbs ?? 250,
    fat: profile.data?.goal_fat ?? 80,
  };
  const goalWeight = (profile.data as { goal_weight?: number | null } | null)?.goal_weight ?? null;
  const current = weights.data?.at(-1)?.weight;
  const first = weights.data?.[0]?.weight;
  const live = (workouts.data ?? []).find((w) => w.id === activeWorkout);

  const recentMeals: MealDraft[] = Array.from(
    new Map((meals.data ?? []).map((m) => [m.name, {
      name: m.name, calories: m.calories ?? 0, protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0,
    } as MealDraft])).values(),
  ).slice(0, 6);

  const allSets = (workouts.data ?? []).flatMap((w) => w.workout_sets ?? []);
  const exerciseNames = Array.from(new Set(allSets.map((s) => s.exercise))).slice(0, 8);
  const liveSets = (live?.workout_sets ?? []).slice().sort((a, b) => a.set_index - b.set_index);
  const yesterdayMeals = (meals.data ?? []).filter((m) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const ts = new Date(m.logged_at).getTime();
    return ts < start.getTime();
  });

  /**
   * Finishing a workout stamps the duration, runs automatic PR detection and
   * awards points. Every award is keyed to the workout or PR row, so tapping
   * finish twice can never double-pay.
   */
  async function finishWorkout() {
    if (!uid || !live) return;
    const startedAt = new Date(live.performed_at).getTime();
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const sets = liveSets.map((s) => ({ exercise: s.exercise, weight: s.weight, reps: s.reps }));

    setSessionOpen(false);
    await supabase.from("workouts")
      .update({ finished_at: new Date().toISOString(), duration_min: durationMin })
      .eq("id", live.id).eq("user_id", uid);

    let detected: DetectedPR[] = [];
    let points = 0;
    try {
      if (sets.length) {
        const rules = await fetchPointsRules();
        detected = await detectPRs(uid, sets);
        if (rules.workoutPoints > 0 && await claimPoints(rules.workoutPoints, "Workout completed", `workout:${live.id}`)) {
          points += rules.workoutPoints;
        }
        for (const pr of detected) {
          if (rules.prPoints > 0 && await claimPoints(rules.prPoints, `PR · ${pr.exercise}`, `pr:${pr.id}:${Math.round(pr.value * 10)}`)) {
            points += rules.prPoints;
          }
        }
      }

      await syncChallengeProgress();
    } catch (e) {
      console.error("[workout] finish", e);
    }

    setSummary({
      workoutId: live.id, title: live.title ?? live.category, category: live.category,
      durationMin, sets, prs: detected, points,
    });
    setActiveWorkout(null);
    setPlan([]);
    invalidate("workouts", "prs", "profile", "points", "points-summary", "challenge-board", "notifications", "notifications-unread");
  }

  if (live && sessionOpen) {
    return (
      <WorkoutSession
        title={live.title ?? live.category}
        category={live.category}
        startedAt={live.performed_at}
        userId={uid}
        workoutId={live.id}
        sets={liveSets.map((s) => ({ id: s.id, exercise: s.exercise, weight: s.weight, reps: s.reps, set_index: s.set_index }))}
        plan={plan}
        onAddSet={(v) => addSet.mutate(v)}
        onDeleteSet={(id) => deleteSet.mutate(id)}
        onFinish={() => { void finishWorkout(); }}
        onClose={() => setSessionOpen(false)}
      />
    );
  }

  if (summary) {
    return (
      <WorkoutComplete
        title={summary.title}
        durationMin={summary.durationMin}
        sets={summary.sets}
        prs={summary.prs}
        pointsEarned={summary.points}
        onClose={() => setSummary(null)}
        onShare={() => {
          const volume = summary.sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
          const pr = summary.prs[0];
          const body = pr
            ? `New PR — ${pr.exercise} ${Math.round(pr.value)} lb. ${summary.sets.length} sets, ${Math.round(volume).toLocaleString()} lb moved.`
            : `${summary.title} done. ${summary.sets.length} sets, ${Math.round(volume).toLocaleString()} lb moved.`;
          setSummary(null);
          navigate({ to: "/community", search: { draft: body } });
        }}
        onSaveTemplate={async () => {
          if (!uid) return;
          const counts = new Map<string, number>();
          for (const s of summary.sets) counts.set(s.exercise, (counts.get(s.exercise) ?? 0) + 1);
          await saveTemplate(uid, {
            name: summary.title,
            category: summary.category,
            exercises: Array.from(counts.entries()).map(([exercise, n]) => ({
              exercise, target_sets: n, target_reps: "8–12", rest_seconds: 90,
            })),
          });
          invalidate("user-templates");
        }}
      />
    );
  }


  return (
    <AppShell>
      <div className="flex items-start justify-between pt-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">Today</p>
          <h1 className="mt-1 text-3xl font-semibold">Your Track</h1>
        </div>
        <button onClick={() => setSheet("goals")} aria-label="Edit goals"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold active:scale-95 transition">
          <Target className="h-3.5 w-3.5" /> Goals
        </button>
      </div>

      <button
        onClick={() => setSheet("trainer")}
        className="mt-5 flex w-full items-center gap-3 rounded-3xl border border-border bg-surface p-5 text-left transition active:scale-[0.99]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Brain className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">AI</span>
          <span className="block text-base font-semibold">MAXOUT Trainer</span>
          <span className="block text-xs text-muted-foreground">Your stats in — daily calories and macros out</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat icon={<Flame className="h-5 w-5 text-accent" />} value={String(streak)} label="Day streak" hint={streak ? "Keep it alive" : "Log a workout"} />
        <BigStat icon={<Dumbbell className="h-5 w-5" />} value={`${weekCount}/5`} label="Workouts this week" hint={weekCount >= 5 ? "Goal hit" : "On pace"} />
      </div>

      <NutritionPanel
        meals={meals.data ?? []}
        goals={goals}
        glasses={glasses}
        onWater={(n) => setWater.mutate(n)}
        onLogMeal={() => setSheet("meal")}
        onRepeat={(m) => addMeals.mutate({ items: [{ name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }], mealType: m.meal_type })}
        onDelete={(id) => deleteMeal.mutate(id)}
      />

      {/* Workout */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workout</h2>
          {live && (
            <button onClick={() => setSessionOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              Resume
            </button>
          )}
        </div>

        {live ? (
          <p className="mt-1 text-xs text-accent">Live · {live.category} · {liveSets.length} sets logged</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Start from a template or customize your workout.</p>
            <div className="mt-3 space-y-2">
              {WORKOUT_TEMPLATES.slice(0, 3).map((t) => (
                <TemplateRow key={t.id} name={t.name} focus={t.focus} count={t.exercises.length}
                  onClick={() => startWorkout.mutate({ category: t.category, title: t.name, exercises: t.exercises })} />
              ))}
            </div>
            <button onClick={() => setSheet("workout")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-xs font-semibold active:scale-[0.98] transition">
              <Plus className="h-3.5 w-3.5" /> All templates & splits
            </button>
          </>
        )}

        {(workouts.data ?? []).length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recent · tap for details</p>
            {workouts.data!.slice(0, 6).map((w) => (
              <button
                key={w.id}
                onClick={() => setDetailId(w.id)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1 truncate">{w.title ?? w.category}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(w.workout_sets ?? []).length} sets · {new Date(w.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      <RemindersCard userId={uid} />

      {detailId && (() => {
        const w = (workouts.data ?? []).find((x) => x.id === detailId);
        if (!w) return null;
        return (
          <WorkoutDetailSheet
            workout={w as unknown as WorkoutDetail}
            onClose={() => setDetailId(null)}
            onDelete={async (id) => {
              if (!uid) throw new Error("You must be signed in.");
              await deleteWorkout(id, uid);
              if (activeWorkout === id) { setActiveWorkout(null); setSessionOpen(false); }
              setDetailId(null);
              invalidate("workouts", "prs", "profile", "points");
            }}
          />
        );
      })()}



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
        {goalWeight != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Goal {goalWeight} lb{current ? ` · ${Math.abs(current - goalWeight).toFixed(1)} lb to go` : ""}
          </p>
        )}

        {(weights.data ?? []).length > 1
          ? <MiniChart points={weights.data!.map((w) => w.weight)} />
          : <p className="mt-3 text-xs text-muted-foreground">Log two entries to see your trend.</p>}
      </section>

      {/* Quick log FAB */}
      <button
        onClick={() => setSheet("quick")}
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition active:scale-90"
        aria-label="Quick log"
      >
        <Plus className="h-6 w-6" />
      </button>

      {sheet === "quick" && (
        <BottomSheet title="Quick log" subtitle="One tap to track anything" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-2 gap-3">
            <QuickTile icon={<Utensils className="h-5 w-5" />} label="Food" hint="AI macros" onClick={() => setSheet("meal")} />
            <QuickTile icon={<Dumbbell className="h-5 w-5" />} label={live ? "Resume workout" : "Start workout"} hint={live ? live.category : "Templates & splits"}
              onClick={() => { if (live) { setSheet(null); setSessionOpen(true); } else setSheet("workout"); }} />
            <QuickTile icon={<Trophy className="h-5 w-5" />} label="New PR" hint="Log a milestone" onClick={() => setSheet("pr")} />
            <QuickTile icon={<Scale className="h-5 w-5" />} label="Bodyweight" hint="Track the trend" onClick={() => setSheet("weight")} />
          </div>
          <button
            onClick={() => { setWater.mutate(glasses + 1); setSheet(null); }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-background py-4 text-sm font-semibold active:scale-[0.98] transition"
          >
            <Droplet className="h-4 w-4" /> Add a glass of water
          </button>
        </BottomSheet>
      )}

      {sheet === "workout" && (
        <BottomSheet title="Start a workout" subtitle="Templates, splits or freestyle" onClose={() => setSheet(null)}>
          <div className="space-y-2">
            {WORKOUT_TEMPLATES.map((t) => (
              <TemplateRow key={t.id} name={t.name} focus={t.focus} count={t.exercises.length}
                onClick={() => { startWorkout.mutate({ category: t.category, title: t.name, exercises: t.exercises }); setSheet(null); }} />
            ))}
          </div>

          <p className="mt-5 text-[11px] uppercase tracking-widest text-muted-foreground">Freestyle</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => { startWorkout.mutate({ category: c, title: `${c} session`, exercises: [] }); setSheet(null); }}
                className="rounded-2xl border border-border bg-background py-3.5 text-xs font-semibold active:scale-95 transition">{c}</button>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-border bg-background p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Growth tips</p>
            <ul className="mt-2 space-y-1.5">
              {GROWTH_TIPS.map((t) => (
                <li key={t} className="text-xs leading-relaxed text-muted-foreground">· {t}</li>
              ))}
            </ul>
          </div>
        </BottomSheet>
      )}

      {sheet === "meal" && (
        <MealSheet
          recent={recentMeals}
          isElite={isElite}
          onUpgrade={() => { setSheet(null); navigate({ to: "/elite" }); }}
          onClose={() => setSheet(null)}
          onSave={(items, mealType) => { addMeals.mutate({ items, mealType }); setSheet(null); }}
        />
      )}

      {sheet === "goals" && (
        <GoalsSheet
          initial={{ ...goals, weight: goalWeight }}
          onClose={() => setSheet(null)}
          onSave={(g) => { saveGoals.mutate(g); setSheet(null); }}
        />
      )}


      {sheet === "trainer" && (
        <TrainerSheet
          initialWeight={current ?? null}
          initialGoalWeight={goalWeight}
          onClose={() => setSheet(null)}
          onApply={(g) => { saveGoals.mutate(g); setSheet(null); }}
        />
      )}

      {sheet === "pr" && (
        <PRSheet exercises={exerciseNames} onClose={() => setSheet(null)} onSave={(v) => { addPR.mutate(v); setSheet(null); }} />
      )}

      {sheet === "weight" && (
        <WeightSheet initial={current ?? 175} onClose={() => setSheet(null)} onSave={(w) => { addWeight.mutate({ weight: w }); setSheet(null); }} />
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


function QuickTile({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-3xl border border-border bg-background p-4 text-left transition active:scale-95">
      <div className="text-accent">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </button>
  );
}

function TemplateRow({ name, focus, count, onClick }: { name: string; focus: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-3xl border border-border bg-background px-4 py-3.5 text-left active:scale-[0.98] transition">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border">
        <Dumbbell className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{focus} · {count} exercises</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}


function PRSheet({ exercises, onClose, onSave }: { exercises: string[]; onClose: () => void; onSave: (v: { exercise: string; value: number; unit: string }) => void }) {
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState(225);
  const [unit, setUnit] = useState("lb");
  return (
    <BottomSheet title="New personal record" subtitle="Log the moment you maxed out" onClose={onClose}>
      <BigInput label="Exercise" value={exercise} onChange={setExercise} placeholder="Deadlift" suggestions={exercises.length ? exercises : COMMON_LIFTS} />
      <div className="mt-3"><Stepper label="Value" value={value} onChange={setValue} step={5} suffix={unit} /></div>
      <div className="mt-3 flex gap-2">
        {["lb", "kg", "reps", "sec"].map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition active:scale-95 ${unit === u ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
            {u}
          </button>
        ))}
      </div>
      <PrimaryButton disabled={!exercise.trim()} onClick={() => onSave({ exercise: exercise.trim(), value, unit })}>
        <Trophy className="h-4 w-4" /> Save PR
      </PrimaryButton>
    </BottomSheet>
  );
}

function WeightSheet({ initial, onClose, onSave }: { initial: number; onClose: () => void; onSave: (w: number) => void }) {
  const [w, setW] = useState(initial);
  return (
    <BottomSheet title="Log bodyweight" subtitle="Same time each day works best" onClose={onClose}>
      <Stepper label="Weight" value={w} onChange={setW} step={0.5} suffix="lb" />
      <PrimaryButton onClick={() => onSave(w)}>Save weight</PrimaryButton>
    </BottomSheet>
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

function SessionLoading() {
  return (
    <AppShell>
      <div className="space-y-3 pt-10">
        <div className="h-24 animate-pulse rounded-3xl bg-surface" />
        <div className="h-40 animate-pulse rounded-3xl bg-surface" />
        <div className="h-40 animate-pulse rounded-3xl bg-surface" />
      </div>
    </AppShell>
  );
}
