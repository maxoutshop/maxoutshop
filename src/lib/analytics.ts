import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Analytics-only queries. These are DELIBERATELY separate from the small,
 * fast recent-data hooks in `db.ts` used by Home/Track/Profile:
 *
 *  - every query is bounded by an explicit date range
 *  - every query has a hard row cap so a long-lived account can never
 *    download unlimited history into the browser
 *  - "all time" is capped at 3 years, which is the practical lifetime of
 *    this app's data, and paginated
 */

export type Range = "30d" | "90d" | "6m" | "1y" | "all";

export const RANGE_LABELS: Record<Range, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "6m": "6 months",
  "1y": "1 year",
  all: "All time",
};

const RANGE_DAYS: Record<Range, number> = {
  "30d": 30, "90d": 90, "6m": 182, "1y": 365, all: 1095,
};

export function rangeStart(range: Range): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - RANGE_DAYS[range]);
  return d;
}

export type AnalyticsWorkout = {
  id: string;
  title: string | null;
  category: string;
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

const PAGE = 200;
const MAX_WORKOUTS = 800;

/** Workouts + sets inside a date range, paginated with a hard ceiling. */
export function useAnalyticsWorkouts(userId?: string, range: Range = "90d") {
  return useQuery({
    queryKey: ["analytics-workouts", userId, range],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsWorkout[]> => {
      const since = rangeStart(range).toISOString();
      const rows: AnalyticsWorkout[] = [];
      for (let from = 0; from < MAX_WORKOUTS; from += PAGE) {
        const { data, error } = await supabase
          .from("workouts")
          .select("id, title, category, performed_at, duration_min, workout_sets(id, exercise, weight, reps, set_index)")
          .eq("user_id", userId!)
          .gte("performed_at", since)
          .order("performed_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as AnalyticsWorkout[]));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  });
}

/** Bodyweight inside a range (light table, single query). */
export function useAnalyticsWeights(userId?: string, range: Range = "90d") {
  return useQuery({
    queryKey: ["analytics-weights", userId, range],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics")
        .select("weight, unit, logged_at")
        .eq("user_id", userId!)
        .gte("logged_at", rangeStart(range).toISOString().slice(0, 10))
        .order("logged_at", { ascending: true })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** PRs inside a range. */
export function useAnalyticsPRs(userId?: string, range: Range = "90d") {
  return useQuery({
    queryKey: ["analytics-prs", userId, range],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", userId!)
        .gte("achieved_at", rangeStart(range).toISOString().slice(0, 10))
        .order("achieved_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Every logged set for ONE exercise, newest first, capped.
 * Used by the strength/exercise history tab so we never pull the whole library.
 */
export function useExerciseHistory(userId?: string, exercise?: string, range: Range = "1y") {
  return useQuery({
    queryKey: ["exercise-history", userId, exercise, range],
    enabled: !!userId && !!exercise,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("id, exercise, weight, reps, set_index, created_at, workout_id, workouts!inner(performed_at, title, category)")
        .eq("user_id", userId!)
        .eq("exercise", exercise!)
        .gte("created_at", rangeStart(range).toISOString())
        .order("created_at", { ascending: false })
        .limit(600);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        exercise: string;
        weight: number | null;
        reps: number | null;
        set_index: number;
        created_at: string;
        workout_id: string;
        workouts: { performed_at: string; title: string | null; category: string };
      }>;
    },
  });
}

/** Distinct exercises the user has logged (for the search/select control). */
export function useLoggedExercises(userId?: string) {
  return useQuery({
    queryKey: ["logged-exercises", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("exercise")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1500);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.exercise))).sort();
    },
  });
}

/**
 * The user's most recent performance of an exercise BEFORE a given workout.
 * Small, indexed query — safe to run during a live session.
 */
export async function fetchPreviousPerformance(
  userId: string,
  exercise: string,
  excludeWorkoutId?: string,
) {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("id, exercise, weight, reps, set_index, created_at, workout_id")
    .eq("user_id", userId)
    .eq("exercise", exercise)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;

  const rows = (data ?? []).filter((r) => r.workout_id !== excludeWorkoutId);
  if (!rows.length) return null;

  const workoutId = rows[0]!.workout_id;
  const sets = rows
    .filter((r) => r.workout_id === workoutId)
    .sort((a, b) => a.set_index - b.set_index);

  return { workoutId, performedAt: sets[0]?.created_at ?? rows[0]!.created_at, sets };
}

/** React hook wrapper for the previous-performance lookup. */
export function usePreviousPerformance(userId?: string, exercise?: string, excludeWorkoutId?: string) {
  return useQuery({
    queryKey: ["previous-performance", userId, exercise, excludeWorkoutId],
    enabled: !!userId && !!exercise,
    staleTime: 30_000,
    queryFn: () => fetchPreviousPerformance(userId!, exercise!, excludeWorkoutId),
  });
}
