import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every premium feature re-checks entitlement server-side. */
async function gate(userId: string, email?: string) {
  const { requireElite } = await import("./wix-elite.server");
  const entitlement = await requireElite(userId, email);
  if (!entitlement.isElite) throw new Error("MAXOUT ELITE required");
}

export const getWeeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    await gate(context.userId, user?.email ?? undefined);
    const { buildWeeklyReport } = await import("./elite-features.server");
    return await buildWeeklyReport(context.userId);
  });

export const getNutritionInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    await gate(context.userId, user?.email ?? undefined);
    const { nutritionInsights } = await import("./elite-features.server");
    return await nutritionInsights(context.userId);
  });

export const getStreakProtection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { streakProtection } = await import("./elite-features.server");
    return await streakProtection(context.userId);
  });

export const spendStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { day?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    await gate(context.userId, user?.email ?? undefined);
    const { useStreakFreeze } = await import("./elite-features.server");
    return await useStreakFreeze(context.userId, data.day);
  });
