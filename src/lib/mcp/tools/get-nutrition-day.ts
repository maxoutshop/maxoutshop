import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_nutrition_day",
  title: "Get a day of nutrition",
  description:
    "List the signed-in member's logged meals for a given day (default today) with calorie and macro totals versus their goals.",
  inputSchema: {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Day in YYYY-MM-DD (UTC). Defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const day = date ?? new Date().toISOString().slice(0, 10);
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;
    const supabase = supabaseForUser(ctx);

    const [{ data: meals, error }, { data: profile }] = await Promise.all([
      supabase
        .from("meals")
        .select("id,name,meal_type,calories,protein,carbs,fat,logged_at")
        .gte("logged_at", start)
        .lte("logged_at", end)
        .order("logged_at", { ascending: true }),
      supabase.from("profiles").select("goal_calories,goal_protein,goal_carbs,goal_fat").eq("id", ctx.getUserId()!).maybeSingle(),
    ]);
    if (error) throw new ToolError(error.message);

    const rows = meals ?? [];
    const totals = rows.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein: acc.protein + (m.protein ?? 0),
        carbs: acc.carbs + (m.carbs ?? 0),
        fat: acc.fat + (m.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      content: [
        {
          type: "text",
          text:
            `${day}: ${rows.length} meals — ${totals.calories} cal, ${totals.protein}p / ${totals.carbs}c / ${totals.fat}f` +
            (profile ? ` (goal ${profile.goal_calories} cal, ${profile.goal_protein}p)` : ""),
        },
      ],
      structuredContent: { day, meals: rows, totals, goals: profile ?? null },
    };
  },
});
