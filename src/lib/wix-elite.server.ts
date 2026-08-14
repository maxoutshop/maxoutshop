/**
 * MAXOUT ELITE billing — Wix Pricing Plans.
 *
 * Wix is the billing source of truth. We mirror each member's plan order into
 * `wix_memberships` so the app can read entitlement fast, and we re-verify
 * against Wix whenever the member returns to MAXOUT or opens the ELITE screen.
 *
 * Identity link: the Wix plan is bought by a Wix site member. We map that Wix
 * member to the authenticated MAXOUT user through the normalised email address
 * (Wix member login email / contact primary email) and persist the resulting
 * `wix_member_id` + `wix_order_id` pair. A given Wix order can only ever be
 * attached to one MAXOUT account (unique constraint on `wix_order_id`).
 */
import { createClient, OAuthStrategy } from "@wix/sdk";
import { redirects } from "@wix/redirects";
import { STORE_URL, WIX_CLIENT_ID, WIX_SITE_ID } from "./wix.server";
import { adminDb } from "./membership.server";

export type BillingInterval = "monthly" | "yearly";

export const ELITE_PLANS: Record<BillingInterval, { id: string; name: string; price: string }> = {
  monthly: { id: "3d1f83a5-4e93-4f99-921a-5d442ee9ea24", name: "MAXOUT Elite Monthly", price: "$9.99/month" },
  yearly: { id: "7a665144-985e-4918-b5ab-e85e703ed710", name: "MAXOUT Elite Yearly", price: "$89.99/year" },
};

export const ELITE_PLAN_IDS = new Set(Object.values(ELITE_PLANS).map((p) => p.id));

/** Wix members area page where a member manages/cancels their plan. */
export const WIX_MANAGE_URL = `${STORE_URL}/account/my-subscriptions`;

export function normalizeInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function planIntervalOf(planId: string): BillingInterval {
  return planId === ELITE_PLANS.yearly.id ? "yearly" : "monthly";
}

/* ------------------------------------------------------------------ gateway */

async function wixApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const connectionApiKey = process.env["WIX_API_KEY"];
  if (!lovableApiKey || !connectionApiKey) throw new Error("Wix is not connected on the server.");

  const res = await fetch(`https://connector-gateway.lovable.dev/wix${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": connectionApiKey,
      "wix-site-id": WIX_SITE_ID,
      "Content-Type": "application/json",
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Wix request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`Wix request failed [${res.status}]`);
  }
  return (await res.json()) as T;
}

/* ----------------------------------------------------------------- checkout */

/**
 * Hosted Wix Pricing Plans checkout for one specific plan. Works identically on
 * web and inside the native in-app browser.
 */
export async function createElitePlanCheckoutUrl(input: {
  interval: BillingInterval;
  userId: string;
  returnUrl: string;
}): Promise<string> {
  const plan = ELITE_PLANS[input.interval];
  const client = createClient({
    modules: { redirects },
    auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }),
  });

  const { redirectSession } = await client.redirects.createRedirectSession({
    paidPlansCheckout: {
      planId: plan.id,
      checkoutData: JSON.stringify({ maxoutUserId: input.userId }),
    },
    callbacks: {
      postFlowUrl: input.returnUrl,
      thankYouPageUrl: input.returnUrl,
    },
  });

  const url = redirectSession?.fullUrl;
  if (!url) throw new Error("Could not start the MAXOUT ELITE checkout.");
  return url;
}

/* ------------------------------------------------------------------ members */

type WixMember = { id?: string; contactId?: string };

async function findWixMemberByEmail(email: string): Promise<WixMember | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const res = await wixApi<{ members?: WixMember[] }>("/members/v1/members/query", {
      method: "POST",
      body: { query: { filter: { loginEmail: normalized }, paging: { limit: 1 } } },
    });
    const member = res.members?.[0];
    if (member?.id) return member;
  } catch (err) {
    console.warn("Wix member lookup failed", err);
  }

  // Fall back to the contact record (member may have signed up with a different casing/alias).
  try {
    const res = await wixApi<{ contacts?: Array<{ id?: string }> }>("/contacts/v4/contacts/query", {
      method: "POST",
      body: { query: { filter: { "info.emails.email": normalized }, paging: { limit: 1 } } },
    });
    const contact = res.contacts?.[0];
    if (contact?.id) return { contactId: contact.id };
  } catch (err) {
    console.warn("Wix contact lookup failed", err);
  }

  return null;
}

/* ------------------------------------------------------------------- orders */

type WixPlanOrder = {
  id?: string;
  planId?: string;
  planName?: string;
  status?: string;
  buyer?: { memberId?: string; contactId?: string };
  startDate?: string;
  endDate?: string;
  autoRenewCanceled?: boolean;
  currentCycle?: { endedDate?: string; startedDate?: string };
  pricing?: { subscription?: { cycleDuration?: { unit?: string } } };
};

async function listPlanOrders(member: WixMember): Promise<WixPlanOrder[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (member.id) params.set("buyerIds", member.id);
  const res = await wixApi<{ orders?: WixPlanOrder[] }>(`/pricing-plans/v2/orders?${params.toString()}`);
  const orders = res.orders ?? [];
  return orders.filter((o) => {
    if (!o.planId || !ELITE_PLAN_IDS.has(o.planId)) return false;
    if (member.id && o.buyer?.memberId) return o.buyer.memberId === member.id;
    if (member.contactId && o.buyer?.contactId) return o.buyer.contactId === member.contactId;
    return false;
  });
}

const ACTIVE_STATUSES = new Set(["ACTIVE", "PENDING"]);

/** An order grants access while it is active, or after cancellation until the paid period ends. */
export function orderGrantsAccess(order: {
  status?: string | null;
  ends_at?: string | null;
  endsAt?: string | null;
}): boolean {
  const status = (order.status ?? "").toUpperCase();
  const end = order.ends_at ?? order.endsAt ?? null;
  const future = !end || new Date(end) > new Date();
  if (ACTIVE_STATUSES.has(status)) return future;
  if (status === "CANCELED" || status === "PAUSED") return !!end && new Date(end) > new Date();
  return false;
}

/* -------------------------------------------------------------- entitlement */

export type EliteEntitlement = {
  isElite: boolean;
  source: "wix" | "grant" | "legacy_stripe" | "none";
  plan: BillingInterval | null;
  planName: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  manageUrl: string;
  linked: boolean;
};

const NOT_ELITE: EliteEntitlement = {
  isElite: false,
  source: "none",
  plan: null,
  planName: null,
  status: null,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  manageUrl: WIX_MANAGE_URL,
  linked: false,
};

/** Reads mirrored state only (fast path, no Wix round-trip). */
export async function readEntitlement(userId: string): Promise<EliteEntitlement> {
  const db = adminDb();
  const [{ data: rows }, { data: grants }, { data: legacy }] = await Promise.all([
    db.from("wix_memberships").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    db.from("elite_grants").select("expires_at").eq("user_id", userId),
    // Grandfathered Stripe members keep access until their paid period ends.
    db.from("subscriptions").select("status, current_period_end").eq("user_id", userId),
  ]);

  const live = (rows ?? []).find((r: any) => orderGrantsAccess(r));
  const comped = (grants ?? []).some((g: any) => !g.expires_at || new Date(g.expires_at) > new Date());

  if (live) {
    return {
      isElite: true,
      source: "wix",
      plan: (live.billing_interval as BillingInterval) ?? planIntervalOf(live.plan_id),
      planName: live.plan_name ?? null,
      status: live.status ?? null,
      expiresAt: live.ends_at ?? null,
      cancelAtPeriodEnd: !!live.auto_renew_canceled,
      manageUrl: WIX_MANAGE_URL,
      linked: true,
    };
  }
  if (comped) {
    return { ...NOT_ELITE, isElite: true, source: "grant", status: "comped", linked: !!(rows ?? []).length };
  }

  const { statusGrantsAccess } = await import("./membership.server");
  const stripeRow = (legacy ?? []).find((s: any) => statusGrantsAccess(s.status, s.current_period_end));
  if (stripeRow) {
    return {
      ...NOT_ELITE,
      isElite: true,
      source: "legacy_stripe",
      status: stripeRow.status,
      expiresAt: stripeRow.current_period_end ?? null,
      linked: !!(rows ?? []).length,
    };
  }

  return { ...NOT_ELITE, linked: !!(rows ?? []).length };
}


/**
 * Pulls this member's Wix plan orders, rewrites the local mirror, refreshes the
 * `profiles.is_elite` flag and returns the resulting entitlement.
 */
export async function syncEliteFromWix(input: {
  userId: string;
  email?: string | undefined;
}): Promise<EliteEntitlement> {
  const { userId, email } = input;
  const db = adminDb();

  if (email) {
    try {
      const member = await findWixMemberByEmail(email);
      if (member) {
        const orders = await listPlanOrders(member);
        for (const order of orders) {
          if (!order.id || !order.planId) continue;

          // Never let one member's Wix order unlock a different MAXOUT account.
          const { data: existing } = await db
            .from("wix_memberships")
            .select("user_id")
            .eq("wix_order_id", order.id)
            .maybeSingle();
          if (existing && existing.user_id !== userId) {
            console.warn(`Wix order ${order.id} already linked to another MAXOUT user`);
            continue;
          }

          const endsAt = order.endDate ?? order.currentCycle?.endedDate ?? null;
          await db.from("wix_memberships").upsert(
            {
              user_id: userId,
              wix_member_id: member.id ?? order.buyer?.memberId ?? null,
              wix_contact_id: member.contactId ?? order.buyer?.contactId ?? null,
              wix_order_id: order.id,
              plan_id: order.planId,
              plan_name: order.planName ?? null,
              billing_interval: planIntervalOf(order.planId),
              status: (order.status ?? "PENDING").toUpperCase(),
              auto_renew_canceled: !!order.autoRenewCanceled,
              started_at: order.startDate ?? order.currentCycle?.startedDate ?? null,
              ends_at: endsAt,
              last_verified_at: new Date().toISOString(),
              raw: order as unknown as Record<string, unknown>,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wix_order_id" },
          );
        }
      }
    } catch (err) {
      // Wix hiccup — fall back to the mirrored state rather than revoking access.
      console.error("syncEliteFromWix failed", err);
    }
  }

  const entitlement = await readEntitlement(userId);
  await db.from("profiles").update({ is_elite: entitlement.isElite }).eq("id", userId);
  return entitlement;
}

/** Server-side gate for ELITE-only features. Uses the mirror; re-verifies when stale. */
export async function requireElite(userId: string, email?: string): Promise<EliteEntitlement> {
  const current = await readEntitlement(userId);
  if (current.isElite) return current;
  return await syncEliteFromWix({ userId, email });
}
