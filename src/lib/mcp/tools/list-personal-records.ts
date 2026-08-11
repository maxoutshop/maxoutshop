import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_personal_records",
  title: "List personal records",
  description: "List the signed-in member's personal records (PRs) by exercise.",
  inputSchema: {
    exercise: z.string().trim().min(1).max(60).optional().describe("Filter to one exercise name."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ exercise, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("personal_records")
      .select("id,exercise,value,unit,achieved_at")
      .order("achieved_at", { ascending: false })
      .limit(limit);
    if (exercise) query = query.ilike("exercise", `%${exercise}%`);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} personal records.` }],
      structuredContent: { records: data ?? [] },
    };
  },
});
