import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) MAXOUT ELITE checkout. Returns a hosted Stripe Checkout
 * URL that the app opens in the in-app browser — the embedded web checkout
 * cannot run from `capacitor://localhost`.
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

          const body = (await request.json().catch(() => ({}))) as {
            interval?: string;
            environment?: string;
            returnUrl?: string;
            cancelUrl?: string;
            email?: string;
          };

          const { normalizeEnv, normalizeInterval, startEliteCheckout } = await import("@/lib/elite.server");
          const { getStripeErrorMessage } = await import("@/lib/stripe.server");

          const origin = new URL(request.url).origin;
          const returnUrl = `${origin}/checkout/return?native=1&session_id={CHECKOUT_SESSION_ID}`;
          const cancelUrl = `${origin}/checkout/return?native=1&canceled=1`;

          try {
            const result = await startEliteCheckout({
              env: normalizeEnv(body.environment),
              userId: user.id,
              email: body.email,
              interval: normalizeInterval(body.interval),
              returnUrl,
              cancelUrl,
            });
            return jsonResponse(request, result);
          } catch (error) {
            return jsonResponse(request, { error: getStripeErrorMessage(error) }, 502);
          }
        } catch (error) {
          console.error("[api/mobile/elite/checkout] failed", error);
          return jsonResponse(request, { error: "Could not start checkout" }, 500);
        }
      },
    },
  },
});
