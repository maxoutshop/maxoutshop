import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Utensils, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/auth";
import { useProfile } from "@/lib/db";
import { useMealHistory, useDeleteMeal } from "@/lib/db";

const TITLE = "Meal history — MAXOUT";
const DESC = "Every meal you've logged, day by day, with calories and macros against your daily goals.";

export const Route = createFileRoute("/meals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MealHistory,
});

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
] as const;

type MealRow = {
  id: string; name: string; meal_type: string; calories: number;
  protein: number; carbs: number; fat: number; logged_at: string;
};

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function labelFor(key: string) {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (key === today) return "Today";
  if (key === y) return "Yesterday";
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

function MealHistory() {
  const { user, loading } = useSession();
  const uid = user?.id;
  const [days, setDays] = useState<number>(30);
  const meals = useMealHistory(uid, days);
  const profile = useProfile(uid);
  const del = useDeleteMeal();

  const groups = useMemo(() => {
    const rows = (meals.data ?? []) as MealRow[];
    const map = new Map<string, MealRow[]>();
    for (const m of rows) {
      const k = dayKey(m.logged_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [meals.data]);

  const goal = profile.data?.goal_calories ?? 2400;

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/track" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Track
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Meal history</h1>
        <p className="mt-1 text-xs text-muted-foreground">Everything you've logged, day by day.</p>

        {loading && (
          <div className="mt-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}

        {!loading && !uid && (
          <Link to="/auth" className="mt-6 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground">
            Sign in to see your meals
          </Link>
        )}

        {uid && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-border p-1">
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setDays(r.key)}
                  className={`rounded-full py-2 text-xs font-semibold transition ${
                    days === r.key ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                  {r.label}
                </button>
              ))}
            </div>

            {meals.isLoading && (
              <div className="mt-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}

            {!meals.isLoading && groups.length === 0 && (
              <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
                <Utensils className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Nothing logged yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Log a meal on Track and it shows up here.</p>
              </div>
            )}

            <div className="mt-5 space-y-5 pb-4">
              {groups.map(([key, rows]) => {
                const t = rows.reduce(
                  (a, m) => ({
                    calories: a.calories + (m.calories ?? 0),
                    protein: a.protein + (m.protein ?? 0),
                    carbs: a.carbs + (m.carbs ?? 0),
                    fat: a.fat + (m.fat ?? 0),
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 },
                );
                return (
                  <section key={key}>
                    <div className="mb-2 flex items-end justify-between">
                      <h2 className="text-sm font-semibold tracking-tight">{labelFor(key)}</h2>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t.calories} / {goal} kcal
                      </p>
                    </div>
                    <div className="mb-2 h-0.5 w-full bg-hairline">
                      <div className="h-full bg-foreground transition-all"
                        style={{ width: `${Math.min(100, Math.round((t.calories / Math.max(1, goal)) * 100))}%` }} />
                    </div>
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      P {t.protein}g · C {t.carbs}g · F {t.fat}g
                    </p>
                    <div className="space-y-1.5">
                      {rows.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                              {m.meal_type} · {new Date(m.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">{m.calories}</p>
                            <p className="text-[10px] text-muted-foreground">P{m.protein} C{m.carbs} F{m.fat}</p>
                          </div>
                          <button
                            aria-label={`Delete ${m.name}`}
                            onClick={() => del.mutate(m.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-background/60 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

