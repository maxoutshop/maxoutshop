/**
 * Transport-aware MAXOUT ELITE billing client.
 *
 * Web  → TanStack server functions (same origin).
 * iOS  → `/api/public/mobile/elite/*` on the published site, with a Supabase
 *        bearer token, because the Capacitor webview is cross-origin.
 */
import { IS_NATIVE_BUILD, apiUrl } from "./api-base";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "./stripe";
import { createEliteCheckout, createPortalSession, syncMembership } from "@/utils/payments.functions";

export type BillingInterval = "monthly" | "yearly";

export type MembershipState = {
  isElite: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentFailed: boolean;
};

async function nativePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method: "POST", headers, body: JSON.stringify(body) });
  } catch (error) {
    console.error(`[native] ${path} failed`, error);
    throw new Error("Can't reach MAXOUT servers. Check your connection.");
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || json?.error) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json as T;
}

async function userEmail(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? undefined;
}

/** Opens a URL: in-app browser on native, same tab on web. */
export async function openBillingUrl(url: string): Promise<void> {
  if (IS_NATIVE_BUILD) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
    return;
  }
  window.location.href = url;
}

/**
 * Starts (or resumes) an ELITE purchase. Returns what happened so the UI can
 * explain it — never grants access by itself.
 */
export async function startEliteCheckout(interval: BillingInterval): Promise<"checkout" | "manage"> {
  const environment = getStripeEnvironment();

  if (IS_NATIVE_BUILD) {
    const res = await nativePost<{ mode: "checkout" | "already_subscribed"; url?: string; portalUrl?: string }>(
      "/api/public/mobile/elite/checkout",
      { interval, environment, email: await userEmail() },
    );
    await openBillingUrl((res.mode === "checkout" ? res.url : res.portalUrl)!);
    return res.mode === "checkout" ? "checkout" : "manage";
  }

  const origin = window.location.origin;
  const res = await createEliteCheckout({
    data: {
      interval,
      environment,
      returnUrl: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/elite?canceled=1`,
    },
  });
  if ("error" in res) throw new Error(res.error);
  if ("managePortalUrl" in res) {
    await openBillingUrl(res.managePortalUrl);
    return "manage";
  }
  await openBillingUrl(res.url);
  return "checkout";
}

/** Stripe Billing Portal — manage payment method, cancel, view invoices. */
export async function openEliteBillingPortal(): Promise<void> {
  const environment = getStripeEnvironment();

  if (IS_NATIVE_BUILD) {
    const res = await nativePost<{ url: string }>("/api/public/mobile/elite/portal", {
      environment,
      email: await userEmail(),
    });
    await openBillingUrl(res.url);
    return;
  }

  const res = await createPortalSession({ data: { returnUrl: window.location.href, environment } });
  if ("error" in res) throw new Error(res.error);
  window.open(res.url, "_blank");
}

/** Server-truth membership refresh (post-checkout, on resume, self-heal). */
export async function refreshMembership(): Promise<MembershipState> {
  const environment = getStripeEnvironment();

  if (IS_NATIVE_BUILD) {
    return await nativePost<MembershipState>("/api/public/mobile/elite/status", {
      environment,
      email: await userEmail(),
    });
  }

  const res = await syncMembership({ data: { environment } });
  if ("error" in res) throw new Error(res.error);
  return res;
}
