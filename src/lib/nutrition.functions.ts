import { createServerFn } from "@tanstack/react-start";
import { estimateFood } from "./nutrition.server";

export const parseFood = createServerFn({ method: "POST" })
  .inputValidator((input: { text?: string; imageDataUrl?: string }) => ({
    text: typeof input?.text === "string" ? input.text.slice(0, 600) : undefined,
    imageDataUrl:
      typeof input?.imageDataUrl === "string" && input.imageDataUrl.startsWith("data:image/")
        ? input.imageDataUrl
        : undefined,
  }))
  .handler(async ({ data }) => {
    if (!data.text && !data.imageDataUrl) return { items: [] };
    const items = await estimateFood(data);
    return { items };
  });
