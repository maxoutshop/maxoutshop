import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) membership refresh. Re-verifies the member's Wix Pricing
 * Plan orders, rewrites the local mirror and returns the authoritative
 * entitlement. Called on app resume so ELITE unlocks without a restart.
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

          const { syncEliteFromWix } = await import("@/lib/wix-elite.server");
          const state = await syncEliteFromWix({ userId: user.id, email: user.email });
          return jsonResponse(request, state);
        } catch (error) {
          console.error("[api/mobile/elite/status] failed", error);
          return jsonResponse(request, { error: "Could not refresh membership" }, 500);
        }
      },
    },
  },
});
