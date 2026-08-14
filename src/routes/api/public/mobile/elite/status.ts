import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) membership refresh. Re-reads Stripe, rewrites the local
 * subscription rows and returns the authoritative entitlement state. Called on
 * app resume so ELITE unlocks without a restart.
 */
export const Route = createFileRoute("/api/public/mobile/elite/status")({
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

          const body = (await request.json().catch(() => ({}))) as { environment?: string; email?: string };
          const { normalizeEnv, syncMembershipForUser } = await import("@/lib/elite.server");
          const { getStripeErrorMessage } = await import("@/lib/stripe.server");

          try {
            const state = await syncMembershipForUser({
              env: normalizeEnv(body.environment),
              userId: user.id,
              email: body.email,
            });
            return jsonResponse(request, state);
          } catch (error) {
            return jsonResponse(request, { error: getStripeErrorMessage(error) }, 502);
          }
        } catch (error) {
          console.error("[api/mobile/elite/status] failed", error);
          return jsonResponse(request, { error: "Could not refresh membership" }, 500);
        }
      },
    },
  },
});
