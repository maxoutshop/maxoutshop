import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Fail = { error: string };

/** Starts a Wix Pricing Plans checkout for the chosen ELITE plan. */
export const startWixEliteCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { interval: "monthly" | "yearly"; returnUrl: string }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | Fail> => {
    try {
      const { createElitePlanCheckoutUrl, normalizeInterval } = await import("@/lib/wix-elite.server");
      const url = await createElitePlanCheckoutUrl({
        interval: normalizeInterval(data.interval),
        userId: context.userId,
        returnUrl: data.returnUrl,
      });
      return { url };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not start checkout." };
    }
  });

/** Server-verified ELITE entitlement, re-checked against Wix. */
export const syncEliteMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    const { syncEliteFromWix } = await import("@/lib/wix-elite.server");
    return await syncEliteFromWix({ userId: context.userId, email: user?.email ?? undefined });
  });

/** Fast read of the mirrored entitlement (no Wix round-trip). */
export const getEliteEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readEntitlement } = await import("@/lib/wix-elite.server");
    return await readEntitlement(context.userId);
  });
