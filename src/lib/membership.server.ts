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

/** Recompute whether a member currently has ELITE (paid or comped) and mirror it onto their profile. */
export async function refreshEliteFlag(userId: string): Promise<boolean> {
  const db = adminDb();

  const { data: subs } = await db
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId);

  const paid = (subs ?? []).some((s: any) => statusGrantsAccess(s.status, s.current_period_end));

  const { data: grants } = await db.from("elite_grants").select("expires_at").eq("user_id", userId);
  const comped = (grants ?? []).some((g: any) => !g.expires_at || new Date(g.expires_at) > new Date());

  const isElite = paid || comped;
  await db.from("profiles").update({ is_elite: isElite }).eq("id", userId);
  return isElite;
}

/** Server-side entitlement gate for premium features. */
export async function requireElite(userId: string): Promise<boolean> {
  return await refreshEliteFlag(userId);
}
