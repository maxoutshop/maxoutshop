import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CoachInput, CoachPlan } from "./coach.types";

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

export const getCoachPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<CoachInput>): CoachInput => ({
    heightIn: clamp(input?.heightIn, 48, 90, 70),
    weightLb: clamp(input?.weightLb, 70, 600, 180),
    goalWeightLb: clamp(input?.goalWeightLb, 70, 600, 180),
    age: clamp(input?.age, 13, 90, 25),
    sex: input?.sex === "female" ? "female" : "male",
    activity: (["sedentary", "light", "moderate", "high", "athlete"] as const).includes(
      input?.activity as CoachInput["activity"],
    )
      ? (input?.activity as CoachInput["activity"])
      : "moderate",
    notes: typeof input?.notes === "string" ? input.notes.slice(0, 300) : undefined,
  }))
  .handler(async ({ data }): Promise<{ plan?: CoachPlan; error?: string }> => {
    try {
      const { buildCoachPlan } = await import("./coach.server");
      const plan = await buildCoachPlan(data);
      return { plan };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Trainer is unavailable right now." };
    }
  });

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Chat with MAXOUT Coach. The athlete snapshot is assembled server-side from
 * the caller's own RLS-scoped client, so no client-supplied "context" is trusted.
 */
export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages?: unknown }): { messages: ChatMsg[] } => {
    const raw = Array.isArray(input?.messages) ? input.messages : [];
    const messages = raw
      .slice(-12)
      .map((m) => m as Record<string, unknown>)
      .filter((m) => typeof m["content"] === "string" && String(m["content"]).trim())
      .map((m) => ({
        role: m["role"] === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m["content"]).slice(0, 1200),
      }));
    if (!messages.length) throw new Error("Ask the coach something first.");
    return { messages };
  })
  .handler(async ({ data, context }): Promise<{ reply?: string; error?: string }> => {
    try {
      const { buildCoachContext, runCoachChat } = await import("./coach-chat.server");
      const snapshot = await buildCoachContext(context.supabase, context.userId);
      const reply = await runCoachChat(snapshot, data.messages);
      return { reply };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Coach is unavailable right now." };
    }
  });
