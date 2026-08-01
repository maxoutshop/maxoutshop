import { useState } from "react";
import { BottomSheet, Stepper, PrimaryButton } from "@/components/LogSheet";
import { getCoachPlan } from "@/lib/coach.functions";
import type { CoachInput, CoachPlan } from "@/lib/coach.types";
import { Brain, Loader2, Target, Sparkles } from "lucide-react";

const ACTIVITY: Array<{ id: CoachInput["activity"]; label: string }> = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
  { id: "athlete", label: "Athlete" },
];

export function TrainerSheet({
  initialWeight,
  initialGoalWeight,
  onClose,
  onApply,
}: {
  initialWeight: number | null;
  initialGoalWeight: number | null;
  onClose: () => void;
  onApply: (g: { calories: number; protein: number; carbs: number; fat: number; weight: number | null }) => void;
}) {
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(10);
  const [weight, setWeight] = useState(initialWeight ?? 180);
  const [goal, setGoal] = useState(initialGoalWeight ?? initialWeight ?? 175);
  const [age, setAge] = useState(25);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState<CoachInput["activity"]>("moderate");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CoachPlan | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await getCoachPlan({
        data: { heightIn: feet * 12 + inches, weightLb: weight, goalWeightLb: goal, age, sex, activity, notes: notes || undefined },
      });
      if (res.error || !res.plan) setError(res.error ?? "Trainer is unavailable right now.");
      else setPlan(res.plan);
    } catch {
      setError("Trainer is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet
      title="AI MAXOUT Trainer"
      subtitle={plan ? "Your personalized nutrition plan" : "Your stats in, your numbers out"}
      onClose={onClose}
    >
      {plan ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background p-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Plan</p>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight">{plan.headline}</h4>
            {plan.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>}
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-tight">{plan.calories}</span>
              <span className="pb-1.5 text-xs uppercase tracking-widest text-muted-foreground">cal / day</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { l: "Protein", v: plan.protein },
                { l: "Carbs", v: plan.carbs },
                { l: "Fat", v: plan.fat },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl border border-border px-3 py-3 text-center">
                  <p className="text-lg font-semibold">{m.v}g</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.l}</p>
                </div>
              ))}
            </div>
            {plan.weeks > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                ~{plan.weeklyChangeLb} lb / week · about {plan.weeks} weeks to {goal} lb
              </p>
            )}
          </div>

          {plan.meals.length > 0 && (
            <div className="rounded-3xl border border-border bg-background p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">A day of eating</p>
              <div className="mt-3 space-y-3">
                {plan.meals.map((m, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.slot}</p>
                      <p className="text-xs text-muted-foreground">{m.idea}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{m.calories} cal · {m.protein}p</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.tips.length > 0 && (
            <div className="rounded-3xl border border-border bg-background p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Coach notes</p>
              <ul className="mt-3 space-y-2">
                {plan.tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PrimaryButton
            onClick={() =>
              onApply({ calories: plan.calories, protein: plan.protein, carbs: plan.carbs, fat: plan.fat, weight: goal })
            }
          >
            <Target className="h-4 w-4" /> Use these as my goals
          </PrimaryButton>
          <button
            onClick={() => setPlan(null)}
            className="mt-2 w-full rounded-full border border-border py-3.5 text-sm font-semibold active:scale-[0.98] transition"
          >
            Adjust stats
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Height (ft)" value={feet} onChange={setFeet} step={1} min={3} />
            <Stepper label="Height (in)" value={inches} onChange={setInches} step={1} min={0} />
          </div>
          <Stepper label="Current weight" value={weight} onChange={setWeight} step={1} suffix="lb" />
          <Stepper label="Goal weight" value={goal} onChange={setGoal} step={1} suffix="lb" />
          <Stepper label="Age" value={age} onChange={setAge} step={1} min={13} />

          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Sex</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`rounded-full py-2.5 text-sm font-semibold capitalize transition active:scale-95 ${
                    sex === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Training level</p>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              {ACTIVITY.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
                    activity === a.id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Anything else? (optional)</p>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vegetarian, lifting 5x a week, bad knees…"
              className="mt-1.5 w-full rounded-3xl border border-border bg-background px-5 py-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground/40"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <PrimaryButton onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Building your plan…" : "Build my plan"}
          </PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}
