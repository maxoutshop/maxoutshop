import { createServerFn } from "@tanstack/react-start";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchCatalog } = await import("./wix.server");
  return await fetchCatalog();
});

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      lines: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        options?: Record<string, string>;
      }>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { createWixCheckoutUrl } = await import("./wix.server");
    const url = await createWixCheckoutUrl(data.lines);
    return { url };
  });
