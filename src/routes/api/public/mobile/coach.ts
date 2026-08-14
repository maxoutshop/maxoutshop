import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) MAXOUT Coach chat. Mirrors the `askCoach` server function:
 * bearer auth, server-side MAXOUT ELITE verification, RLS-scoped athlete
 * snapshot. No client-supplied context is trusted.
 */
export const Route = createFileRoute("/api/public/mobile/coach")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/mobile-cors.server");
        return preflight(request);
      },
      POST: async ({ request }) => {
        const { jsonResponse, userFromBearer } = await import("@/lib/mobile-cors.server");
        try {
          const user = await userFromBearer(request);
          if (!user) return jsonResponse(request, { error: "Unauthorized" }, 401);

          const { requireElite } = await import("@/lib/wix-elite.server");
          const entitlement = await requireElite(user.id, user.email);
          if (!entitlement.isElite) return jsonResponse(request, { error: "MAXOUT ELITE required" }, 402);

          const raw = (await request.json()) as { messages?: unknown };
          const messages = (Array.isArray(raw?.messages) ? raw.messages : [])
            .slice(-12)
            .map((m) => m as Record<string, unknown>)
            .filter((m) => typeof m["content"] === "string" && String(m["content"]).trim())
            .map((m) => ({
              role: m["role"] === "assistant" ? ("assistant" as const) : ("user" as const),
              content: String(m["content"]).slice(0, 1200),
            }));
          if (!messages.length) return jsonResponse(request, { error: "Ask the coach something first." }, 400);

          const { createClient } = await import("@supabase/supabase-js");
          const authHeader = request.headers.get("authorization") ?? "";
          const supabase = createClient(
            process.env["SUPABASE_URL"]!,
            process.env["SUPABASE_PUBLISHABLE_KEY"]!,
            {
              auth: { persistSession: false, autoRefreshToken: false },
              global: { headers: { Authorization: authHeader } },
            },
          );

          const { buildCoachContext, runCoachChat } = await import("@/lib/coach-chat.server");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const snapshot = await buildCoachContext(supabase as any, user.id);
          const reply = await runCoachChat(snapshot, messages);
          return jsonResponse(request, { reply });
        } catch (error) {
          console.error("[api/mobile/coach] failed", error);
          return jsonResponse(request, { error: "Coach is unavailable right now." }, 502);
        }
      },
    },
  },
});
