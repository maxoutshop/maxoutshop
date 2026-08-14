import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { url: string } | { managePortalUrl: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

/**
 * Web ELITE checkout. Returns a hosted Stripe Checkout URL (works identically
 * on web and native) or, if the member already subscribes, a Billing Portal URL.
 */
export const createEliteCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { interval: "monthly" | "yearly"; returnUrl: string; cancelUrl: string; environment: StripeEnv }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    const { userId, supabase } = context;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { normalizeEnv, normalizeInterval, startEliteCheckout } = await import("@/lib/elite.server");

      const result = await startEliteCheckout({
        env: normalizeEnv(data.environment),
        userId,
        email: user?.email ?? undefined,
        interval: normalizeInterval(data.interval),
        returnUrl: data.returnUrl,
        cancelUrl: data.cancelUrl,
      });

      return result.mode === "checkout" ? { url: result.url } : { managePortalUrl: result.portalUrl };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { normalizeEnv, createBillingPortal } = await import("@/lib/elite.server");

      const url = await createBillingPortal({
        env: normalizeEnv(data.environment),
        userId,
        email: user?.email ?? undefined,
        returnUrl: data.returnUrl ?? "/elite",
      });
      return { url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type SyncResult =
  | {
      isElite: boolean;
      status: string | null;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      paymentFailed: boolean;
    }
  | { error: string };

/**
 * Pulls the member's subscriptions straight from Stripe and rewrites the local
 * rows. Used after checkout (before the webhook lands) and as a self-heal if a
 * webhook was ever missed.
 */
export const syncMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<SyncResult> => {
    const { userId, supabase } = context;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { normalizeEnv, syncMembershipForUser } = await import("@/lib/elite.server");

      const state = await syncMembershipForUser({
        env: normalizeEnv(data.environment),
        userId,
        email: user?.email ?? undefined,
      });
      return {
        isElite: state.isElite,
        status: state.status,
        currentPeriodEnd: state.currentPeriodEnd,
        cancelAtPeriodEnd: state.cancelAtPeriodEnd,
        paymentFailed: state.paymentFailed,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
