import { supabase } from "@/integrations/supabase/client";
import { epley1RM, type SetRow } from "@/lib/workout-math";

export type DetectedPR = {
  id: string;
  exercise: string;
  kind: "weight" | "e1rm";
  value: number;
  reps: number | null;
  unit: string;
  previous: number | null;
};

/**
 * Automatic PR detection.
 *
 * For every exercise in a finished workout we compute the heaviest weight and
 * the best Epley estimated 1RM. Each (user, exercise, kind) has AT MOST ONE
 * automatic row — enforced by a partial unique index — so refreshing or
 * re-running detection can never create duplicates: an existing row is only
 * updated when the new value is genuinely higher.
 */
export async function detectPRs(userId: string, sets: SetRow[]): Promise<DetectedPR[]> {
  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) {
    if (!s.weight || !s.reps) continue;
    const list = byExercise.get(s.exercise) ?? [];
    list.push(s);
    byExercise.set(s.exercise, list);
  }
  if (!byExercise.size) return [];

  const exercises = Array.from(byExercise.keys());
  const { data: existing, error } = await supabase
    .from("personal_records")
    .select("id, exercise, kind, value")
    .eq("user_id", userId)
    .eq("source", "auto")
    .in("exercise", exercises);
  if (error) throw error;

  const prior = new Map<string, { id: string; value: number }>();
  for (const row of existing ?? []) prior.set(`${row.exercise}|${row.kind}`, { id: row.id, value: Number(row.value) });

  const found: DetectedPR[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [exercise, list] of byExercise) {
    const heaviest = list.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
    const best1rm = list.reduce((a, b) => (epley1RM(b.weight, b.reps) > epley1RM(a.weight, a.reps) ? b : a));

    const candidates: Array<{ kind: "weight" | "e1rm"; value: number; reps: number | null }> = [
      { kind: "weight", value: Number(heaviest.weight ?? 0), reps: heaviest.reps ?? null },
      { kind: "e1rm", value: Math.round(epley1RM(best1rm.weight, best1rm.reps) * 10) / 10, reps: best1rm.reps ?? null },
    ];

    for (const c of candidates) {
      if (c.value <= 0) continue;
      const key = `${exercise}|${c.kind}`;
      const before = prior.get(key);
      if (before && before.value >= c.value) continue;

      if (before) {
        const { error: upErr } = await supabase
          .from("personal_records")
          .update({ value: c.value, reps: c.reps, achieved_at: today })
          .eq("id", before.id).eq("user_id", userId);
        if (upErr) throw upErr;
        found.push({ id: before.id, exercise, kind: c.kind, value: c.value, reps: c.reps, unit: "lb", previous: before.value });
      } else {
        const { data, error: insErr } = await supabase
          .from("personal_records")
          .insert({
            user_id: userId, exercise, kind: c.kind, value: c.value,
            reps: c.reps, unit: "lb", achieved_at: today, source: "auto",
          })
          .select("id").single();
        // Unique index collision means another tab already recorded it.
        if (insErr) { if (insErr.code === "23505") continue; throw insErr; }
        found.push({ id: data.id, exercise, kind: c.kind, value: c.value, reps: c.reps, unit: "lb", previous: null });
      }
    }
  }

  return found;
}

/** Idempotent point award. The event key makes repeat calls no-ops. */
export async function claimPoints(delta: number, reason: string, eventKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_points_event", {
    _delta: delta, _reason: reason, _event_key: eventKey,
  });
  if (error) { console.error("[points]", error.message); return false; }
  return !!data;
}
