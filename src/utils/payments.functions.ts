import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import type Stripe from "stripe";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0]!.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0]!;
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { userId, supabase } = context;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0]!;
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId, managed_payments: "true" },
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    try {
      const stripe = createStripeClient(data.environment);

      // Self-heal: if no local row exists (missed webhook), resolve the Stripe
      // customer directly so billing management still works.
      let customerId = sub?.stripe_customer_id as string | undefined;
      if (!customerId) {
        const { data: { user } } = await supabase.auth.getUser();
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });
        customerId = found.data[0]?.id;
        if (!customerId && user?.email) {
          const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
          customerId = byEmail.data[0]?.id;
        }
      }
      if (!customerId) return { error: "No billing account found for this member." };
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type SyncResult = { isElite: boolean; status: string | null; currentPeriodEnd: string | null } | { error: string };

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
    const { upsertSubscription, refreshEliteFlag, statusGrantsAccess } = await import("@/lib/membership.server");

    try {
      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      for (const sub of list.data) {
        await upsertSubscription(sub, data.environment, userId);
      }

      const isElite = await refreshEliteFlag(userId);
      const newest = list.data[0];
      const item = newest?.items?.data?.[0] as { current_period_end?: number } | undefined;
      const end = item?.current_period_end ?? null;

      return {
        isElite,
        status: newest?.status ?? null,
        currentPeriodEnd: end ? new Date(end * 1000).toISOString() : null,
        ...(newest ? { _ok: statusGrantsAccess(newest.status, end ? new Date(end * 1000).toISOString() : null) } : {}),
      } as SyncResult;
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
