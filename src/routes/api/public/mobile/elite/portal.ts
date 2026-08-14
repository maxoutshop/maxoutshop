import { createFileRoute } from "@tanstack/react-router";

/** Native (Capacitor) Stripe Billing Portal session. */
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

          const body = (await request.json().catch(() => ({}))) as { environment?: string; email?: string };
          const { normalizeEnv, createBillingPortal } = await import("@/lib/elite.server");
          const { getStripeErrorMessage } = await import("@/lib/stripe.server");
          const origin = new URL(request.url).origin;

          try {
            const url = await createBillingPortal({
              env: normalizeEnv(body.environment),
              userId: user.id,
              email: body.email,
              returnUrl: `${origin}/checkout/return?native=1&managed=1`,
            });
            return jsonResponse(request, { url });
          } catch (error) {
            return jsonResponse(request, { error: getStripeErrorMessage(error) }, 502);
          }
        } catch (error) {
          console.error("[api/mobile/elite/portal] failed", error);
          return jsonResponse(request, { error: "Could not open billing" }, 500);
        }
      },
    },
  },
});
