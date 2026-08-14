import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) MANAGE ELITE. Wix bills the membership, so this returns
 * the Wix members-area subscriptions page for the signed-in member.
 */
export const Route = createFileRoute("/api/public/mobile/elite/portal")({
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

          const { WIX_MANAGE_URL } = await import("@/lib/wix-elite.server");
          return jsonResponse(request, { url: WIX_MANAGE_URL });
        } catch (error) {
          console.error("[api/mobile/elite/portal] failed", error);
          return jsonResponse(request, { error: "Could not open membership management" }, 500);
        }
      },
    },
  },
});
