import { useMemo, useState } from "react";
import { Plus, Droplet, Trash2, RotateCcw, Utensils } from "lucide-react";

export type MealRow = {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
};

type Goals = { calories: number; protein: number; carbs: number; fat: number };

const ORDER = ["breakfast", "lunch", "dinner", "snack", "meal"];

function startOfDay(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
}

function sum(list: MealRow[]) {
  return list.reduce(
    (s, m) => ({
      calories: s.calories + (m.calories ?? 0),
      protein: s.protein + (m.protein ?? 0),
      carbs: s.carbs + (m.carbs ?? 0),
      fat: s.fat + (m.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function NutritionPanel({
  meals,
  goals,
  glasses,
  onWater,
  onLogMeal,
  onRepeat,
  onDelete,
}: {
  meals: MealRow[];
  goals: Goals;
  glasses: number;
  onWater: (n: number) => void;
  onLogMeal: () => void;
  onRepeat: (m: MealRow) => void;
  onDelete: (id: string) => void;
}) {
  const [day, setDay] = useState<0 | 1>(0);

  const { list, totals, yesterdayTotals } = useMemo(() => {
    const todayStart = startOfDay(0).getTime();
    const yStart = startOfDay(1).getTime();
    const t = meals.filter((m) => new Date(m.logged_at).getTime() >= todayStart);
    const y = meals.filter((m) => {
      const ts = new Date(m.logged_at).getTime();
      return ts >= yStart && ts < todayStart;
    });
    const active = day === 0 ? t : y;
    return { list: active, totals: sum(active), yesterdayTotals: sum(y) };
  }, [meals, day]);

  const grouped = useMemo(() => {
    const map = new Map<string, MealRow[]>();
    for (const m of list) {
      const k = (m.meal_type || "meal").toLowerCase();
      map.set(k, [...(map.get(k) ?? []), m]);
    }
    return [...map.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  }, [list]);

  const pct = Math.min(100, Math.round((totals.calories / (goals.calories || 1)) * 100));
  const left = Math.max(0, goals.calories - totals.calories);
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex rounded-full bg-background p-1">
          {(["Today", "Yesterday"] as const).map((lbl, i) => (
            <button
              key={lbl}
              onClick={() => setDay(i as 0 | 1)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
                day === i ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <button
          onClick={onLogMeal}
          className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background active:scale-95 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Log
        </button>
      </div>

      {/* Calorie hero */}
      <div className="flex items-center gap-5 px-5 pt-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="7" />
            <circle
              cx="60" cy="60" r={r} fill="none" stroke="var(--color-foreground)" strokeWidth="7"
              strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.16,1,.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{totals.calories}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {day === 0 ? `${left} left` : "calories"}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} />
          <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} />
          <MacroBar label="Fat" value={totals.fat} goal={goals.fat} />
        </div>
      </div>

      {day === 0 && yesterdayTotals.calories > 0 && (
        <p className="px-5 pt-4 text-[11px] text-muted-foreground">
          Yesterday: <span className="text-foreground">{yesterdayTotals.calories} cal</span> · {yesterdayTotals.protein}p /{" "}
          {yesterdayTotals.carbs}c / {yesterdayTotals.fat}f
        </p>
      )}

      {day === 0 && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl bg-background/60 p-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Droplet className="h-4 w-4" /> Water
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                aria-label={`${i + 1} glasses`}
                onClick={() => onWater(i + 1 === glasses ? i : i + 1)}
                className={`h-6 w-2 rounded-full transition ${i < glasses ? "bg-foreground" : "bg-secondary"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 px-5 pb-5">
        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border px-5 py-8 text-center">
            <Utensils className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Nothing logged {day === 0 ? "today" : "yesterday"}</p>
            {day === 0 && (
              <button onClick={onLogMeal} className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-semibold active:scale-95 transition">
                Describe a meal
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([type, rows]) => (
              <div key={type}>
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">{type}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{sum(rows).calories} cal</p>
                </div>
                <div className="mt-2 space-y-1.5">
                  {rows.map((m) => (
                    <div key={m.id} className="group flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(m.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {m.protein}p /{" "}
                          {m.carbs}c / {m.fat}f
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{m.calories}</span>
                      <button onClick={() => onRepeat(m)} aria-label={`Log ${m.name} again`} className="active:scale-90 transition">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => onDelete(m.id)} aria-label={`Delete ${m.name}`} className="active:scale-90 transition">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MacroBar({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / (goal || 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}<span className="text-muted-foreground">/{goal}g</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${pct}%`, transition: "width 700ms cubic-bezier(.16,1,.3,1)" }}
        />
      </div>
    </div>
  );
}
