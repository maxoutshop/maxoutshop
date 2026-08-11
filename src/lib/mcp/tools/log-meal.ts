import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_meal",
  title: "Log a meal",
  description: "Log a food item with its macros to the signed-in member's MAXOUT nutrition diary.",
  inputSchema: {
    name: z.string().trim().min(1).max(80).describe("Food name, e.g. 'Chicken burrito bowl'."),
    calories: z.number().int().min(0).max(5000),
    protein: z.number().int().min(0).max(500).default(0),
    carbs: z.number().int().min(0).max(1000).default(0),
    fat: z.number().int().min(0).max(500).default(0),
    meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, calories, protein, carbs, fat, meal_type }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("meals")
      .insert({ user_id: ctx.getUserId()!, name, calories, protein, carbs, fat, meal_type })
      .select()
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Logged ${name} — ${calories} cal, ${protein}g protein.` }],
      structuredContent: { meal: data },
    };
  },
});
