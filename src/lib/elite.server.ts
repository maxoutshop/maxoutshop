/**
 * Single source of truth for MAXOUT ELITE billing.
 *
 * Both transports use this module:
 *  - web: `createServerFn` wrappers in `src/utils/payments.functions.ts`
 *  - native (Capacitor): `/api/public/mobile/elite/*` routes
 *
 * Server state (Stripe + our `subscriptions` table) is always authoritative;
 * the client never decides who is ELITE.
 */
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import type Stripe from "stripe";

export type BillingInterval = "monthly" | "yearly";

export const ELITE_PRICE_LOOKUP: Record<BillingInterval, string> = {
  monthly: "elite_monthly",
  yearly: "elite_yearly",
};

export function normalizeEnv(value: unknown): StripeEnv {
  return value === "live" ? "live" : "sandbox";
}

export function normalizeInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

/** Human price id (`elite_monthly`) -> live Stripe price object. */
export async function resolveElitePrice(stripe: Stripe, priceLookupKey: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(priceLookupKey)) throw new Error("Invalid price");
  const prices = await stripe.prices.list({ lookup_keys: [priceLookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`Membership price "${priceLookupKey}" is not configured in Stripe.`);
  return price;
}

/** Find (or create) the Stripe customer that carries this Supabase user id. */
export async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { userId: string; email?: string | undefined },
): Promise<string> {
  const { userId, email } = options;
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0]!.id;

  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(email ? { email } : {}),
    metadata: { userId },
  });
  return created.id;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

/** True when Stripe already has a subscription we must not duplicate. */
export async function findReusableSubscription(stripe: Stripe, customerId: string) {
  const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return (
    list.data.find((s) => ACTIVE_STATUSES.has(s.status)) ??
    list.data.find((s) => s.status === "canceled" && (s.items.data[0]?.current_period_end ?? 0) * 1000 > Date.now()) ??
    null
  );
}

export type EliteCheckoutResult =
  | { mode: "checkout"; url: string }
  | { mode: "already_subscribed"; portalUrl: string };

/**
 * Creates a hosted Stripe Checkout Session for ELITE, or — when the member
 * already has a subscription — a Billing Portal session instead.
 */
export async function startEliteCheckout(input: {
  env: StripeEnv;
  userId: string;
  email?: string | undefined;
  interval: BillingInterval;
  returnUrl: string;
  cancelUrl: string;
}): Promise<EliteCheckoutResult> {
  const stripe = createStripeClient(input.env);
  const price = await resolveElitePrice(stripe, ELITE_PRICE_LOOKUP[input.interval]);
  const customerId = await resolveOrCreateCustomer(stripe, { userId: input.userId, email: input.email });

  const existing = await findReusableSubscription(stripe, customerId);
  if (existing) {
    // Keep local state honest, then hand them to billing management.
    const { upsertSubscription } = await import("@/lib/membership.server");
    await upsertSubscription(existing, input.env, input.userId);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: input.returnUrl,
    });
    return { mode: "already_subscribed", portalUrl: portal.url };
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: price.id, quantity: 1 }],
    mode: "subscription",
    success_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    customer: customerId,
    managed_payments: { enabled: true },
    client_reference_id: input.userId,
    metadata: { userId: input.userId, managed_payments: "true" },
    subscription_data: { metadata: { userId: input.userId } },
  } as Stripe.Checkout.SessionCreateParams);

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { mode: "checkout", url: session.url };
}

/** Secure Billing Portal session for an existing member. */
export async function createBillingPortal(input: {
  env: StripeEnv;
  userId: string;
  email?: string | undefined;
  returnUrl: string;
}): Promise<string> {
  const stripe = createStripeClient(input.env);
  const customerId = await resolveOrCreateCustomer(stripe, { userId: input.userId, email: input.email });
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: input.returnUrl,
  });
  return portal.url;
}

export type MembershipState = {
  isElite: boolean;
  source: "stripe" | "grant" | "none";
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  paymentFailed: boolean;
};

/**
 * Pulls Stripe truth for this member, rewrites the local rows and returns the
 * entitlement state. Used after checkout, on app resume and as a self-heal when
 * a webhook was missed.
 */
export async function syncMembershipForUser(input: {
  env: StripeEnv;
  userId: string;
  email?: string | undefined;
}): Promise<MembershipState> {
  const stripe = createStripeClient(input.env);
  const { upsertSubscription, refreshEliteFlag, statusGrantsAccess } = await import("@/lib/membership.server");

  const customerId = await resolveOrCreateCustomer(stripe, { userId: input.userId, email: input.email });
  const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  for (const sub of list.data) {
    await upsertSubscription(sub, input.env, input.userId);
  }

  const isElite = await refreshEliteFlag(input.userId);

  const newest = list.data[0];
  const item = newest?.items?.data?.[0] as { current_period_end?: number } | undefined;
  const end = item?.current_period_end ?? (newest as { current_period_end?: number } | undefined)?.current_period_end;
  const currentPeriodEnd = end ? new Date(end * 1000).toISOString() : null;
  const status = newest?.status ?? null;
  const paid = statusGrantsAccess(status, currentPeriodEnd);

  let source: MembershipState["source"] = "none";
  if (paid) source = "stripe";
  else if (isElite) source = "grant";

  return {
    isElite,
    source,
    status,
    cancelAtPeriodEnd: newest?.cancel_at_period_end ?? false,
    currentPeriodEnd,
    paymentFailed: !!status && ["past_due", "unpaid", "incomplete"].includes(status),
  };
}
