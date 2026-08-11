import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_bodyweight",
  title: "Log bodyweight",
  description: "Log a bodyweight entry for the signed-in member.",
  inputSchema: {
    weight: z.number().min(50).max(700),
    unit: z.enum(["lb", "kg"]).default("lb"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ weight, unit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("body_metrics")
      .insert({ user_id: ctx.getUserId()!, weight, unit })
      .select()
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Logged bodyweight ${weight} ${unit}.` }],
      structuredContent: { entry: data },
    };
  },
});
