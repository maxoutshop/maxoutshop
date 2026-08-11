import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_workouts",
  title: "List recent workouts",
  description: "List the signed-in member's most recent MAXOUT workouts, optionally with every logged set.",
  inputSchema: {
    limit: z.number().int().min(1).max(25).default(5),
    include_sets: z.boolean().default(true),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, include_sets }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("id,title,category,performed_at,duration_min,notes")
      .order("performed_at", { ascending: false })
      .limit(limit);
    if (error) throw new ToolError(error.message);

    let sets: unknown[] = [];
    if (include_sets && workouts?.length) {
      const { data, error: setsError } = await supabase
        .from("workout_sets")
        .select("workout_id,exercise,set_index,weight,reps")
        .in("workout_id", workouts.map((w) => w.id))
        .order("set_index", { ascending: true });
      if (setsError) throw new ToolError(setsError.message);
      sets = data ?? [];
    }

    return {
      content: [{ type: "text", text: `${workouts?.length ?? 0} recent workouts.` }],
      structuredContent: { workouts: workouts ?? [], sets },
    };
  },
});
