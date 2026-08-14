import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateExercise } from "@/lib/workout-templates";

export type UserTemplate = {
  id: string;
  name: string;
  category: string;
  focus: string | null;
  description: string | null;
  workout_template_exercises: Array<{
    id: string;
    exercise: string;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    position: number;
  }>;
};

export function useUserTemplates(userId?: string) {
  return useQuery({
    queryKey: ["user-templates", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, name, category, focus, description, workout_template_exercises(id, exercise, target_sets, target_reps, rest_seconds, position)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as UserTemplate[]).map((t) => ({
        ...t,
        workout_template_exercises: [...t.workout_template_exercises].sort((a, b) => a.position - b.position),
      }));
    },
  });
}

export function templateToPlan(t: UserTemplate): TemplateExercise[] {
  return t.workout_template_exercises.map((e) => ({
    name: e.exercise,
    sets: e.target_sets,
    reps: e.target_reps,
  }));
}

export type TemplateDraft = {
  id?: string;
  name: string;
  category: string;
  focus?: string | null;
  exercises: Array<{ exercise: string; target_sets: number; target_reps: string; rest_seconds: number }>;
};

/** Create or replace a template and its ordered exercises. */
export async function saveTemplate(userId: string, draft: TemplateDraft): Promise<string> {
  let id = draft.id;
  if (id) {
    const { error } = await supabase
      .from("workout_templates")
      .update({ name: draft.name, category: draft.category, focus: draft.focus ?? null })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    const { error: delErr } = await supabase
      .from("workout_template_exercises").delete().eq("template_id", id).eq("user_id", userId);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: userId, name: draft.name, category: draft.category, focus: draft.focus ?? null })
      .select("id").single();
    if (error) throw error;
    id = data.id;
  }

  if (draft.exercises.length) {
    const rows = draft.exercises.map((e, i) => ({
      template_id: id!, user_id: userId, exercise: e.exercise,
      target_sets: e.target_sets, target_reps: e.target_reps,
      rest_seconds: e.rest_seconds, position: i,
    }));
    const { error } = await supabase.from("workout_template_exercises").insert(rows);
    if (error) throw error;
  }
  return id!;
}

export async function deleteTemplate(userId: string, id: string) {
  const { error } = await supabase.from("workout_templates").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function duplicateTemplate(userId: string, t: UserTemplate) {
  return saveTemplate(userId, {
    name: `${t.name} copy`,
    category: t.category,
    focus: t.focus,
    exercises: t.workout_template_exercises.map((e) => ({
      exercise: e.exercise, target_sets: e.target_sets,
      target_reps: e.target_reps, rest_seconds: e.rest_seconds,
    })),
  });
}

/**
 * Exercise list of the user's most recent finished workout — used by
 * "Repeat last workout". Reads only; the old workout is never mutated.
 */
export async function lastWorkoutPlan(userId: string): Promise<{ title: string; category: string; plan: TemplateExercise[] } | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, title, category, workout_sets(exercise, set_index)")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(5);
  if (error) throw error;

  const w = (data ?? []).find((x) => (x.workout_sets ?? []).length > 0);
  if (!w) return null;

  const counts = new Map<string, number>();
  for (const s of w.workout_sets ?? []) counts.set(s.exercise, (counts.get(s.exercise) ?? 0) + 1);

  return {
    title: w.title ?? w.category,
    category: w.category,
    plan: Array.from(counts.entries()).map(([name, sets]) => ({ name, sets, reps: "" })),
  };
}
