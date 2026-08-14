import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CoachMessage = { role: "user" | "assistant"; content: string };

type DB = SupabaseClient<Database>;

/**
 * Compact, read-only snapshot of the athlete. Everything is fetched with the
 * caller's own RLS-scoped client, so the coach can only ever see the data the
 * signed-in user could see themselves.
 */
export async function buildCoachContext(supabase: DB, userId: string): Promise<string> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [profile, workouts, prs, meals, weights] = await Promise.all([
    supabase.from("profiles")
      .select("display_name, goal_calories, goal_protein, goal_carbs, goal_fat, goal_weight, points")
      .eq("id", userId).maybeSingle(),
    supabase.from("workouts")
      .select("category, title, performed_at, duration_min, workout_sets(exercise, weight, reps)")
      .eq("user_id", userId).gte("performed_at", since)
      .order("performed_at", { ascending: false }).limit(20),
    supabase.from("personal_records")
      .select("exercise, value, unit, reps, achieved_at")
      .eq("user_id", userId).order("achieved_at", { ascending: false }).limit(12),
    supabase.from("meals")
      .select("name, meal_type, calories, protein, carbs, fat, logged_at")
      .eq("user_id", userId).gte("logged_at", new Date(Date.now() - 7 * 864e5).toISOString())
      .order("logged_at", { ascending: false }).limit(40),
    supabase.from("body_metrics")
      .select("weight, unit, logged_at")
      .eq("user_id", userId).order("logged_at", { ascending: false }).limit(10),
  ]);

  const p = profile.data;
  const lines: string[] = [];

  lines.push(`Athlete: ${p?.display_name ?? "MAXOUT member"}`);
  if (p) {
    lines.push(
      `Daily targets: ${p.goal_calories} cal, ${p.goal_protein}g protein, ${p.goal_carbs}g carbs, ${p.goal_fat}g fat` +
        (p.goal_weight ? `; goal weight ${p.goal_weight} lb` : ""),
    );
  }

  const w = weights.data ?? [];
  if (w.length) {
    lines.push(`Recent bodyweight: ${w.slice(0, 5).map((r) => `${r.weight}${r.unit} on ${r.logged_at}`).join(", ")}`);
  }

  const ws = workouts.data ?? [];
  lines.push(`Workouts in last 30 days: ${ws.length}`);
  for (const row of ws.slice(0, 8)) {
    const sets = (row.workout_sets ?? []) as Array<{ exercise: string; weight: number | null; reps: number | null }>;
    const byEx = new Map<string, string[]>();
    for (const s of sets) {
      const list = byEx.get(s.exercise) ?? [];
      list.push(`${s.weight ?? 0}x${s.reps ?? 0}`);
      byEx.set(s.exercise, list);
    }
    const summary = [...byEx.entries()].slice(0, 6).map(([ex, v]) => `${ex} ${v.slice(0, 5).join("/")}`).join("; ");
    lines.push(`- ${row.performed_at.slice(0, 10)} ${row.title ?? row.category}${row.duration_min ? ` (${row.duration_min}m)` : ""}: ${summary || "no sets"}`);
  }

  const prRows = prs.data ?? [];
  if (prRows.length) {
    lines.push(`Personal records: ${prRows.map((r) => `${r.exercise} ${r.value}${r.unit}${r.reps ? `x${r.reps}` : ""} (${r.achieved_at})`).join(", ")}`);
  }

  const m = meals.data ?? [];
  if (m.length) {
    const byDay = new Map<string, { cal: number; pro: number }>();
    for (const meal of m) {
      const day = meal.logged_at.slice(0, 10);
      const acc = byDay.get(day) ?? { cal: 0, pro: 0 };
      acc.cal += meal.calories; acc.pro += meal.protein;
      byDay.set(day, acc);
    }
    lines.push(`Nutrition last 7 days: ${[...byDay.entries()].map(([d, v]) => `${d}: ${v.cal}cal/${v.pro}p`).join(", ")}`);
    lines.push(`Frequent foods: ${[...new Set(m.map((x) => x.name))].slice(0, 12).join(", ")}`);
  } else {
    lines.push("Nutrition last 7 days: nothing logged.");
  }

  return lines.join("\n").slice(0, 6000);
}

const SYSTEM = `You are MAXOUT COACH: an elite strength and nutrition coach inside the MAXOUT app.
You are speaking to the athlete whose real training and nutrition data appears below.
Rules:
- Use their actual numbers. Reference specific lifts, dates, and macro gaps instead of generic advice.
- Be direct, motivating and concise. Short paragraphs or tight bullet lists. Under 180 words unless asked for a full plan.
- Never invent data. If something is not logged, say so and tell them what to log.
- No medical claims or diagnosis. Suggest a professional for injuries or medical issues.
- Plain text only, no markdown headers or tables.`;

export async function runCoachChat(context: string, messages: CoachMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Coach is not configured.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `ATHLETE DATA\n${context}` },
        ...messages,
      ],
    }),
  });

  if (res.status === 429) throw new Error("Coach is busy — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted.");
  if (!res.ok) throw new Error(`Coach couldn't respond (${res.status}).`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Coach had nothing to say. Try rephrasing.");
  return text;
}
