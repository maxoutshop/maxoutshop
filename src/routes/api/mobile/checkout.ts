import { createFileRoute } from "@tanstack/react-router";

type Line = {
  productId: string;
  variantId?: string;
  quantity: number;
  options?: Record<string, string>;
};

/** Native (Capacitor) Wix checkout handoff. Mirrors the `createCheckout` server fn. */
export const Route = createFileRoute("/api/mobile/checkout")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/mobile-cors.server");
        return preflight(request);
      },
      POST: async ({ request }) => {
        const { jsonResponse } = await import("@/lib/mobile-cors.server");
        try {
          const body = (await request.json()) as { lines?: Line[]; email?: string };
          const lines = (body.lines ?? []).filter(
            (l) => l && typeof l.productId === "string" && Number(l.quantity) > 0,
          );
          if (!lines.length) return jsonResponse(request, { error: "Cart is empty" }, 400);

          const { createWixCheckoutUrl } = await import("@/lib/wix.server");
          const url = await createWixCheckoutUrl(
            lines,
            typeof body.email === "string" ? body.email : undefined,
          );
          return jsonResponse(request, { url });
        } catch (error) {
          console.error("[api/mobile/checkout] failed", error);
          return jsonResponse(
            request,
            { error: error instanceof Error ? error.message : "Checkout failed" },
            502,
          );
        }
      },
    },
  },
});
