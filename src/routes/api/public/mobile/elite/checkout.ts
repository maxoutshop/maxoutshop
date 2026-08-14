import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) MAXOUT ELITE checkout — Wix Pricing Plans.
 * Returns a hosted Wix plan checkout URL that the app opens in the in-app browser.
 */
export const Route = createFileRoute("/api/public/mobile/elite/checkout")({
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

          const body = (await request.json().catch(() => ({}))) as { interval?: string };
          const { createElitePlanCheckoutUrl, normalizeInterval } = await import("@/lib/wix-elite.server");

          const origin = new URL(request.url).origin;
          const url = await createElitePlanCheckoutUrl({
            interval: normalizeInterval(body.interval),
            userId: user.id,
            returnUrl: `${origin}/checkout/return?native=1&elite=1`,
          });

          return jsonResponse(request, { url });
        } catch (error) {
          console.error("[api/mobile/elite/checkout] failed", error);
          return jsonResponse(request, { error: "Could not start checkout" }, 500);
        }
      },
    },
  },
});
