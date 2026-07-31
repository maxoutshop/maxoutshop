import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RedeemResult = { ok: true; expiresAt: string | null; label: string | null } | { ok: false; error: string };

export const redeemPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const code = String(data?.code ?? "").trim().toUpperCase();
    if (code.length < 4 || code.length > 64) throw new Error("Invalid code");
    return { code };
  })
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: promo } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();

    if (!promo || !promo.active) return { ok: false, error: "That code isn't valid." };
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { ok: false, error: "That code has expired." };

    const { data: existing } = await supabaseAdmin
      .from("elite_grants")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("code", promo.code)
      .maybeSingle();
    if (existing) return { ok: true, expiresAt: existing.expires_at, label: promo.label };

    if (promo.redeemed_count >= promo.max_redemptions) return { ok: false, error: "That code has been fully claimed." };

    const expires = new Date();
    expires.setMonth(expires.getMonth() + (promo.grant_months ?? 12));

    const { error: grantError } = await supabaseAdmin
      .from("elite_grants")
      .insert({ user_id: userId, code: promo.code, expires_at: expires.toISOString() });
    if (grantError) return { ok: false, error: "Could not redeem that code. Try again." };

    await supabaseAdmin
      .from("promo_codes")
      .update({ redeemed_count: promo.redeemed_count + 1 })
      .eq("code", promo.code);

    return { ok: true, expiresAt: expires.toISOString(), label: promo.label };
  });
