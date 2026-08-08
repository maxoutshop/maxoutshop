import { createFileRoute } from "@tanstack/react-router";

/**
 * Native (Capacitor) AI food parsing. Preserves the same auth + MAXOUT ELITE
 * gate as the `parseFood` server function; secrets stay server-side.
 */
export const Route = createFileRoute("/api/mobile/parse-food")({
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
          if (!user) return jsonResponse(request, { items: [], error: "Unauthorized" }, 401);

          const raw = (await request.json()) as { text?: string; imageDataUrl?: string };
          const text = typeof raw?.text === "string" ? raw.text.slice(0, 600) : undefined;
          const imageDataUrl =
            typeof raw?.imageDataUrl === "string" && raw.imageDataUrl.startsWith("data:image/")
              ? raw.imageDataUrl.slice(0, 8_000_000)
              : undefined;

          if (!text && !imageDataUrl) return jsonResponse(request, { items: [] });

          if (imageDataUrl) {
            const { requireElite } = await import("@/lib/membership.server");
            const elite = await requireElite(user.id);
            if (!elite) {
              return jsonResponse(request, {
                items: [],
                error: "Photo logging is a MAXOUT ELITE feature.",
              });
            }
          }

          const { estimateFood } = await import("@/lib/nutrition.server");
          const items = await estimateFood({ text, imageDataUrl });
          return jsonResponse(request, { items });
        } catch (error) {
          console.error("[api/mobile/parse-food] failed", error);
          return jsonResponse(
            request,
            { items: [], error: error instanceof Error ? error.message : "Could not read that" },
            502,
          );
        }
      },
    },
  },
});
