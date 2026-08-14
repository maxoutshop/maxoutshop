/**
 * MAXOUT ELITE premium feature engine (server-only).
 *
 * Weekly reports, nutrition insights and streak protection. Every function here
 * assumes the caller has already been verified as ELITE.
 */
import { adminDb } from "./membership.server";
import { totalVolume } from "./workout-math";

const DAY = 86_400_000;

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing `ref` (UTC). */
export function weekStartOf(ref: Date): Date {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d;
}

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  sets: number;
  volume: number;
  minutes: number;
  daysTrained: number;
  prs: Array<{ exercise: string; value: number; unit: string }>;
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  calorieGoal: number;
  proteinGoal: number;
  weightChange: number | null;
  headline: string;
  focus: string[];
};

/** Builds (and caches) the report for the week containing `ref`. */
export async function buildWeeklyReport(userId: string, ref = new Date(Date.now() - 7 * DAY)): Promise<WeeklyReport> {
  const db = adminDb();
  const start = weekStartOf(ref);
  const end = new Date(start.getTime() + 7 * DAY);
  const weekStart = isoDay(start);

  const [{ data: workouts }, { data: prs }, { data: meals }, { data: weights }, { data: profile }] = await Promise.all([
    db
      .from("workouts")
      .select("id, performed_at, duration_min, workout_sets(exercise, weight, reps)")
      .eq("user_id", userId)
      .gte("performed_at", start.toISOString())
      .lt("performed_at", end.toISOString()),
    db
      .from("personal_records")
      .select("exercise, value, unit, achieved_at")
      .eq("user_id", userId)
      .gte("achieved_at", weekStart)
      .lt("achieved_at", isoDay(end)),
    db
      .from("meals")
      .select("calories, protein, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", start.toISOString())
      .lt("logged_at", end.toISOString()),
    db
      .from("body_metrics")
      .select("weight, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", weekStart)
      .lt("logged_at", isoDay(end))
      .order("logged_at", { ascending: true }),
    db.from("profiles").select("goal_calories, goal_protein").eq("id", userId).maybeSingle(),
  ]);

  const rows = workouts ?? [];
  const sets = rows.flatMap((w: any) => w.workout_sets ?? []);
  const trainedDays = new Set(rows.map((w: any) => String(w.performed_at).slice(0, 10)));

  const mealDays = new Map<string, { cal: number; pro: number }>();
  for (const m of meals ?? []) {
    const key = String((m as any).logged_at).slice(0, 10);
    const cur = mealDays.get(key) ?? { cal: 0, pro: 0 };
    cur.cal += (m as any).calories ?? 0;
    cur.pro += (m as any).protein ?? 0;
    mealDays.set(key, cur);
  }
  const daysLogged = mealDays.size;
  const avgCalories = daysLogged ? Math.round([...mealDays.values()].reduce((a, d) => a + d.cal, 0) / daysLogged) : 0;
  const avgProtein = daysLogged ? Math.round([...mealDays.values()].reduce((a, d) => a + d.pro, 0) / daysLogged) : 0;

  const w0 = (weights ?? [])[0] as any;
  const wN = (weights ?? [])[(weights ?? []).length - 1] as any;
  const weightChange = w0 && wN && w0 !== wN ? Number(wN.weight) - Number(w0.weight) : null;

  const calorieGoal = (profile as any)?.goal_calories ?? 0;
  const proteinGoal = (profile as any)?.goal_protein ?? 0;
  const volume = totalVolume(sets as never);

  const focus: string[] = [];
  if (trainedDays.size < 3) focus.push("Get to 3+ training days — consistency beats intensity right now.");
  if (daysLogged < 5) focus.push("Log food on at least 5 days so the numbers mean something.");
  if (proteinGoal && avgProtein < proteinGoal * 0.9) focus.push(`Protein averaged ${avgProtein}g vs a ${proteinGoal}g goal — add a shake or lean meal.`);
  if (calorieGoal && avgCalories > calorieGoal * 1.1) focus.push(`Calories ran ${avgCalories} vs ${calorieGoal} — tighten portions on rest days.`);
  if (!focus.length) focus.push("Everything is on track. Add a little weight or a rep to your main lifts next week.");

  const headline = rows.length
    ? `${rows.length} session${rows.length === 1 ? "" : "s"}, ${Math.round(volume).toLocaleString()} lb moved across ${trainedDays.size} day${trainedDays.size === 1 ? "" : "s"}.`
    : "No sessions logged this week — next week is the rebuild.";

  const report: WeeklyReport = {
    weekStart,
    weekEnd: isoDay(new Date(end.getTime() - DAY)),
    workouts: rows.length,
    sets: sets.length,
    volume: Math.round(volume),
    minutes: rows.reduce((a: number, w: any) => a + (w.duration_min ?? 0), 0),
    daysTrained: trainedDays.size,
    prs: (prs ?? []).map((p: any) => ({ exercise: p.exercise, value: Number(p.value), unit: p.unit })),
    avgCalories,
    avgProtein,
    daysLogged,
    calorieGoal,
    proteinGoal,
    weightChange,
    headline,
    focus,
  };

  await db
    .from("weekly_reports")
    .upsert(
      { user_id: userId, week_start: weekStart, payload: report, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" },
    );

  return report;
}

export type NutritionInsights = {
  days: Array<{ day: string; calories: number; protein: number; carbs: number; fat: number }>;
  avgCalories: number;
  avgProtein: number;
  proteinHitRate: number;
  bestDay: string | null;
  worstDay: string | null;
  tips: string[];
};

/** 30-day nutrition trend analysis — ELITE only. */
export async function nutritionInsights(userId: string): Promise<NutritionInsights> {
  const db = adminDb();
  const since = new Date(Date.now() - 30 * DAY);

  const [{ data: meals }, { data: profile }] = await Promise.all([
    db
      .from("meals")
      .select("calories, protein, carbs, fat, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: true }),
    db.from("profiles").select("goal_calories, goal_protein").eq("id", userId).maybeSingle(),
  ]);

  const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const m of meals ?? []) {
    const key = String((m as any).logged_at).slice(0, 10);
    const cur = map.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    cur.calories += (m as any).calories ?? 0;
    cur.protein += (m as any).protein ?? 0;
    cur.carbs += (m as any).carbs ?? 0;
    cur.fat += (m as any).fat ?? 0;
    map.set(key, cur);
  }

  const days = [...map.entries()].map(([day, v]) => ({ day, ...v }));
  const n = days.length || 1;
  const avgCalories = Math.round(days.reduce((a, d) => a + d.calories, 0) / n);
  const avgProtein = Math.round(days.reduce((a, d) => a + d.protein, 0) / n);
  const proteinGoal = (profile as any)?.goal_protein ?? 0;
  const calorieGoal = (profile as any)?.goal_calories ?? 0;
  const hits = proteinGoal ? days.filter((d) => d.protein >= proteinGoal * 0.95).length : 0;

  const sorted = [...days].sort((a, b) => b.protein - a.protein);

  const tips: string[] = [];
  if (proteinGoal && avgProtein < proteinGoal) tips.push(`You're ${proteinGoal - avgProtein}g/day short on protein. Front-load it at breakfast.`);
  if (calorieGoal && Math.abs(avgCalories - calorieGoal) > calorieGoal * 0.15)
    tips.push(avgCalories > calorieGoal ? "You're consistently over your calorie target — check weekend days." : "You're eating well under target; low intake stalls strength.");
  if (days.length < 15) tips.push("Log more days — 30-day trends get sharp once you're logging most days.");
  if (!tips.length) tips.push("Intake is dialed in. Keep it boring and keep progressing the bar.");

  return {
    days,
    avgCalories,
    avgProtein,
    proteinHitRate: days.length ? Math.round((hits / days.length) * 100) : 0,
    bestDay: sorted[0]?.day ?? null,
    worstDay: sorted[sorted.length - 1]?.day ?? null,
    tips,
  };
}

export type StreakProtection = {
  available: boolean;
  usedThisCycle: boolean;
  cycleStart: string;
  protectedDays: string[];
};

/** One freeze per rolling 30-day cycle, ELITE only. */
export async function streakProtection(userId: string): Promise<StreakProtection> {
  const db = adminDb();
  const cycleStart = isoDay(new Date(Date.now() - 30 * DAY));
  const { data } = await db
    .from("streak_freezes")
    .select("cycle_start, protected_day")
    .eq("user_id", userId)
    .gte("cycle_start", cycleStart)
    .order("protected_day", { ascending: false });

  const rows = data ?? [];
  const { data: all } = await db.from("streak_freezes").select("protected_day").eq("user_id", userId);

  return {
    available: rows.length === 0,
    usedThisCycle: rows.length > 0,
    cycleStart,
    protectedDays: (all ?? []).map((r: any) => r.protected_day),
  };
}

/** Spends the member's freeze on a missed day (defaults to yesterday). */
export async function useStreakFreeze(userId: string, day?: string): Promise<StreakProtection & { error?: string }> {
  const db = adminDb();
  const state = await streakProtection(userId);
  if (!state.available) return { ...state, error: "You've already used your freeze this cycle." };

  const target = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : isoDay(new Date(Date.now() - DAY));
  const cycleStart = isoDay(new Date());

  const { error } = await db
    .from("streak_freezes")
    .insert({ user_id: userId, cycle_start: cycleStart, protected_day: target });
  if (error) return { ...state, error: "Could not use your freeze right now." };

  return await streakProtection(userId);
}
