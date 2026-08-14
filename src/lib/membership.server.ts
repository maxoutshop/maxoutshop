import { createClient } from "@supabase/supabase-js";

export type StripeEnvName = "sandbox" | "live";

let _admin: ReturnType<typeof createClient> | null = null;

/** Service-role client. Server-only. */
export function adminDb() {
  if (!_admin) {
    _admin = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin as any;
}

function priceIdOf(item: any) {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
}

/** True when a Stripe status + period grants access. Failed payments (past_due/unpaid) do NOT. */
export function statusGrantsAccess(status?: string | null, periodEnd?: string | null): boolean {
  if (!status) return false;
  const future = !periodEnd || new Date(periodEnd) > new Date();
  if (["active", "trialing"].includes(status)) return future;
  if (status === "canceled") return !!periodEnd && new Date(periodEnd) > new Date();
  return false;
}

/** Write (or refresh) the local row for a Stripe subscription object. */
export async function upsertSubscription(subscription: any, env: StripeEnvName, fallbackUserId?: string) {
  const db = adminDb();
  let userId: string | undefined = subscription?.metadata?.userId ?? fallbackUserId;

  if (!userId) {
    // Fall back to a previously stored row for this customer.
    const { data } = await db
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .limit(1)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) {
    console.error("upsertSubscription: no userId for subscription", subscription?.id);
    return null;
  }

  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id,
      price_id: priceIdOf(item),
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await refreshEliteFlag(userId);
  return userId;
}

/**
 * Recompute whether a member currently has ELITE and mirror it onto the profile.
 * Billing truth is Wix Pricing Plans; comped grants and grandfathered Stripe
 * subscriptions are honoured by `readEntitlement`.
 */
export async function refreshEliteFlag(userId: string): Promise<boolean> {
  const { readEntitlement } = await import("./wix-elite.server");
  const entitlement = await readEntitlement(userId);
  await adminDb().from("profiles").update({ is_elite: entitlement.isElite }).eq("id", userId);
  return entitlement.isElite;
}

/** Server-side entitlement gate for premium features. */
export async function requireElite(userId: string, email?: string): Promise<boolean> {
  const { requireElite: gate } = await import("./wix-elite.server");
  const entitlement = await gate(userId, email);
  return entitlement.isElite;
}

