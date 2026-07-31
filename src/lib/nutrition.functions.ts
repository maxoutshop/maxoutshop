import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ParseResult = { items: Array<Record<string, unknown>>; error?: string };

export const parseFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text?: string; imageDataUrl?: string }) => ({
    text: typeof input?.text === "string" ? input.text.slice(0, 600) : undefined,
    imageDataUrl:
      typeof input?.imageDataUrl === "string" && input.imageDataUrl.startsWith("data:image/")
        ? input.imageDataUrl.slice(0, 8_000_000)
        : undefined,
  }))
  .handler(async ({ data, context }): Promise<ParseResult> => {
    if (!data.text && !data.imageDataUrl) return { items: [] };

    if (data.imageDataUrl) {
      const { requireElite } = await import("./membership.server");
      const elite = await requireElite(context.userId);
      if (!elite) {
        return { items: [], error: "Photo logging is a MAXOUT ELITE feature." };
      }
    }

    const { estimateFood } = await import("./nutrition.server");
    const items = await estimateFood(data);
    return { items };
  });
