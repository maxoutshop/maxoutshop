import { useState } from "react";
import { Star, Trash2, Utensils, Plus, CopyPlus } from "lucide-react";
import { BottomSheet, PrimaryButton } from "@/components/LogSheet";
import { mealTotals, type SavedMeal } from "@/lib/saved-meals";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Saved meals: reusable meal templates the athlete builds once and logs in a
 * single tap. Also hosts "copy yesterday", which re-logs a full previous day.
 */
export function SavedMealsSheet({
  meals,
  yesterdayCount,
  onClose,
  onLog,
  onToggleFavorite,
  onDelete,
  onCopyYesterday,
  onCreate,
}: {
  meals: SavedMeal[];
  yesterdayCount: number;
  onClose: () => void;
  onLog: (meal: SavedMeal, mealType: string) => void;
  onToggleFavorite: (meal: SavedMeal) => void;
  onDelete: (meal: SavedMeal) => void;
  onCopyYesterday: () => void;
  onCreate: () => void;
}) {
  const [pickFor, setPickFor] = useState<SavedMeal | null>(null);

  return (
    <BottomSheet title="Saved meals" subtitle="Log the food you eat all the time in one tap" onClose={onClose}>
      <button
        onClick={onCopyYesterday}
        disabled={yesterdayCount === 0}
        className="flex w-full items-center gap-3 rounded-3xl border border-border bg-background px-4 py-4 text-left transition active:scale-[0.98] disabled:opacity-40"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border">
          <CopyPlus className="h-4 w-4 text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Copy yesterday</span>
          <span className="block text-[11px] text-muted-foreground">
            {yesterdayCount ? `Re-log all ${yesterdayCount} meals from yesterday` : "Nothing logged yesterday"}
          </span>
        </span>
      </button>

      <div className="mt-4 space-y-2">
        {meals.map((m) => {
          const t = mealTotals(m.saved_meal_items);
          return (
            <div key={m.id} className="rounded-3xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => onToggleFavorite(m)} aria-label="Favorite" className="mt-0.5 active:scale-90 transition">
                  <Star className={`h-4 w-4 ${m.favorite ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {Math.round(t.calories)} kcal · {Math.round(t.protein)}P {Math.round(t.carbs)}C {Math.round(t.fat)}F
                    {m.saved_meal_items.length > 1 ? ` · ${m.saved_meal_items.length} items` : ""}
                  </p>
                </div>
                <button onClick={() => onDelete(m)} aria-label="Delete saved meal" className="active:scale-90 transition">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {pickFor?.id === m.id ? (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {MEAL_TYPES.map((mt) => (
                    <button key={mt} onClick={() => { onLog(m, mt); setPickFor(null); }}
                      className="rounded-full border border-border py-2 text-[11px] font-semibold capitalize active:scale-95 transition">
                      {mt}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => setPickFor(m)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-xs font-semibold active:scale-[0.98] transition">
                  <Utensils className="h-3.5 w-3.5" /> Log this meal
                </button>
              )}
            </div>
          );
        })}

        {meals.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No saved meals yet. Log a meal, then save it as a template.
          </p>
        )}
      </div>

      <PrimaryButton onClick={onCreate}>
        <Plus className="h-4 w-4" /> Build a new saved meal
      </PrimaryButton>
    </BottomSheet>
  );
}
