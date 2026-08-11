import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_personal_record",
  title: "Log a personal record",
  description: "Record a new personal record (PR) for the signed-in member.",
  inputSchema: {
    exercise: z.string().trim().min(1).max(60),
    value: z.number().min(0).max(2000),
    unit: z.enum(["lb", "kg", "reps", "sec", "mi"]).default("lb"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ exercise, value, unit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personal_records")
      .insert({ user_id: ctx.getUserId()!, exercise, value, unit })
      .select()
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `PR logged: ${exercise} ${value} ${unit}.` }],
      structuredContent: { record: data },
    };
  },
});
