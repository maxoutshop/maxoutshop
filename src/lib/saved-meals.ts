import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SavedMealItem = {
  id: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  position: number;
};

export type SavedMeal = {
  id: string;
  name: string;
  meal_type: string;
  favorite: boolean;
  created_at: string;
  saved_meal_items: SavedMealItem[];
};

export function useSavedMeals(userId?: string) {
  return useQuery({
    queryKey: ["saved-meals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_meals")
        .select("id, name, meal_type, favorite, created_at, saved_meal_items(id, name, quantity, calories, protein, carbs, fat, position)")
        .eq("user_id", userId!)
        .order("favorite", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as SavedMeal[]).map((m) => ({
        ...m,
        saved_meal_items: [...m.saved_meal_items].sort((a, b) => a.position - b.position),
      }));
    },
  });
}

export type MealItemDraft = {
  name: string; quantity?: string | null;
  calories: number; protein: number; carbs: number; fat: number;
};

export function mealTotals(items: Array<Pick<MealItemDraft, "calories" | "protein" | "carbs" | "fat">>) {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + (i.calories || 0),
      protein: a.protein + (i.protein || 0),
      carbs: a.carbs + (i.carbs || 0),
      fat: a.fat + (i.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function saveMealTemplate(
  userId: string,
  input: { name: string; meal_type: string; items: MealItemDraft[] },
) {
  const { data, error } = await supabase
    .from("saved_meals")
    .insert({ user_id: userId, name: input.name, meal_type: input.meal_type })
    .select("id").single();
  if (error) throw error;

  if (input.items.length) {
    const rows = input.items.map((i, idx) => ({
      saved_meal_id: data.id, user_id: userId, name: i.name,
      quantity: i.quantity ?? null, calories: Math.round(i.calories),
      protein: Math.round(i.protein), carbs: Math.round(i.carbs),
      fat: Math.round(i.fat), position: idx,
    }));
    const { error: iErr } = await supabase.from("saved_meal_items").insert(rows);
    if (iErr) throw iErr;
  }
  return data.id;
}

export async function toggleFavoriteMeal(userId: string, id: string, favorite: boolean) {
  const { error } = await supabase
    .from("saved_meals").update({ favorite }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteSavedMeal(userId: string, id: string) {
  const { error } = await supabase.from("saved_meals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/** Log a saved meal into today's diary as a single entry. */
export async function logSavedMeal(userId: string, meal: SavedMeal, mealType?: string) {
  const t = mealTotals(meal.saved_meal_items);
  const { error } = await supabase.from("meals").insert({
    user_id: userId,
    name: meal.name,
    meal_type: mealType ?? meal.meal_type,
    calories: Math.round(t.calories),
    protein: Math.round(t.protein),
    carbs: Math.round(t.carbs),
    fat: Math.round(t.fat),
    logged_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Copy a whole previous day of eating into today. */
export async function copyDayMeals(
  userId: string,
  meals: Array<{ name: string; meal_type: string; calories: number; protein: number; carbs: number; fat: number }>,
) {
  if (!meals.length) return 0;
  const now = new Date().toISOString();
  const { error } = await supabase.from("meals").insert(
    meals.map((m) => ({
      user_id: userId, name: m.name, meal_type: m.meal_type,
      calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      logged_at: now,
    })),
  );
  if (error) throw error;
  return meals.length;
}
