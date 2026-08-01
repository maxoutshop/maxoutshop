export type CoachInput = {
  heightIn: number;
  weightLb: number;
  goalWeightLb: number;
  age: number;
  sex: "male" | "female";
  activity: "sedentary" | "light" | "moderate" | "high" | "athlete";
  notes?: string;
};

export type CoachPlan = {
  headline: string;
  summary: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weeklyChangeLb: number;
  weeks: number;
  meals: Array<{ slot: string; idea: string; calories: number; protein: number }>;
  tips: string[];
};

const SYSTEM = `You are the MAXOUT AI TRAINER, an elite but plain-spoken nutrition coach.
Given a lifter's stats and target weight, produce a safe, effective daily nutrition plan.
Rules:
- Estimate TDEE with Mifflin-St Jeor plus the activity factor, then apply a sensible deficit or surplus.
- Never prescribe under 1500 cal for men or 1200 for women. Cap weekly change at 1.5 lb.
- Protein 0.8-1.1 g per lb of target bodyweight. Fat at least 0.3 g per lb. Rest from carbs.
- Macros must roughly add up to the calorie total (4/4/9).
- 4 meal ideas max, short and practical. 4 short tips max, each under 120 characters.
- headline is under 6 words. summary is 2 sentences max.
Respond with JSON only, shaped:
{"headline":"","summary":"","calories":0,"protein":0,"carbs":0,"fat":0,"weeklyChangeLb":0,"weeks":0,
"meals":[{"slot":"","idea":"","calories":0,"protein":0}],"tips":[""]}`;

export async function buildCoachPlan(input: CoachInput): Promise<CoachPlan> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");

  const prompt = [
    `Height: ${input.heightIn} inches`,
    `Current weight: ${input.weightLb} lb`,
    `Goal weight: ${input.goalWeightLb} lb`,
    `Age: ${input.age}`,
    `Sex: ${input.sex}`,
    `Training/activity level: ${input.activity}`,
    input.notes ? `Notes: ${input.notes}` : "",
  ].filter(Boolean).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep using the trainer.");
  if (!res.ok) throw new Error(`Trainer couldn't build a plan (${res.status}). Try again.`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return normalize(json.choices?.[0]?.message?.content ?? "", input);
}

function num(v: unknown, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function normalize(raw: string, input: CoachInput): CoachPlan {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]) as Record<string, unknown>; } catch { /* ignore */ } }
  }

  const cut = input.goalWeightLb < input.weightLb;
  const floor = input.sex === "female" ? 1200 : 1500;
  const calories = Math.max(floor, num(parsed["calories"], cut ? 2000 : 2800));
  const protein = Math.max(80, num(parsed["protein"], Math.round(input.goalWeightLb)));
  const fat = Math.max(30, num(parsed["fat"], Math.round(calories * 0.25 / 9)));
  const carbs = Math.max(50, num(parsed["carbs"], Math.round((calories - protein * 4 - fat * 9) / 4)));

  const meals = Array.isArray(parsed["meals"])
    ? (parsed["meals"] as Array<Record<string, unknown>>).slice(0, 4).map((m) => ({
        slot: String(m["slot"] ?? "Meal").slice(0, 24),
        idea: String(m["idea"] ?? "").slice(0, 120),
        calories: num(m["calories"]),
        protein: num(m["protein"]),
      }))
    : [];

  const tips = Array.isArray(parsed["tips"])
    ? (parsed["tips"] as unknown[]).slice(0, 4).map((t) => String(t).slice(0, 160))
    : [];

  const diff = Math.abs(input.weightLb - input.goalWeightLb);
  const weeklyRaw = Number(parsed["weeklyChangeLb"]);
  const weekly = Number.isFinite(weeklyRaw) && weeklyRaw !== 0 ? Math.min(1.5, Math.abs(weeklyRaw)) : cut ? 1 : 0.5;

  return {
    headline: String(parsed["headline"] ?? (cut ? "Lean out, stay strong" : "Build clean size")).slice(0, 48),
    summary: String(parsed["summary"] ?? "").slice(0, 320),
    calories,
    protein,
    carbs,
    fat,
    weeklyChangeLb: Number(weekly.toFixed(2)),
    weeks: num(parsed["weeks"], diff ? Math.ceil(diff / weekly) : 0),
    meals,
    tips,
  };
}
