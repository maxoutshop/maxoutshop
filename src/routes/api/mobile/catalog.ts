import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) catalog endpoint. TanStack server functions are
 * same-origin RPCs, so the static native build talks to plain HTTP routes.
 */
export const Route = createFileRoute("/api/mobile/catalog")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/mobile-cors.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { jsonResponse } = await import("@/lib/mobile-cors.server");
        try {
          const { fetchCatalog } = await import("@/lib/wix.server");
          const products = await fetchCatalog();
          return jsonResponse(request, { products });
        } catch (error) {
          console.error("[api/mobile/catalog] failed", error);
          return jsonResponse(
            request,
            { error: error instanceof Error ? error.message : "Catalog unavailable" },
            502,
          );
        }
      },
    },
  },
});
