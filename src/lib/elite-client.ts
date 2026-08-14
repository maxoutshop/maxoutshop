/**
 * Transport-aware MAXOUT ELITE client — billing runs on Wix Pricing Plans.
 *
 * Web  → TanStack server functions (same origin).
 * iOS  → `/api/public/mobile/elite/*` on the published site, with a Supabase
 *        bearer token, because the Capacitor webview is cross-origin.
 */
import { IS_NATIVE_BUILD, apiUrl } from "./api-base";
import { supabase } from "@/integrations/supabase/client";
import { getEliteEntitlement, startWixEliteCheckout, syncEliteMembership } from "@/utils/elite.functions";

export type BillingInterval = "monthly" | "yearly";

export type MembershipState = {
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

/** Opens a URL: in-app browser on native, same tab on web. */
export async function openBillingUrl(url: string): Promise<void> {
  if (IS_NATIVE_BUILD) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
    return;
  }
  window.location.href = url;
}

/** Sends the member to the Wix hosted checkout for the chosen ELITE plan. */
export async function startEliteCheckout(interval: BillingInterval): Promise<"checkout"> {
  if (IS_NATIVE_BUILD) {
    const res = await nativePost<{ url: string }>("/api/public/mobile/elite/checkout", { interval });
    await openBillingUrl(res.url);
    return "checkout";
  }

  const returnUrl = `${window.location.origin}/checkout/return?elite=1`;
  const res = await startWixEliteCheckout({ data: { interval, returnUrl } });
  if ("error" in res) throw new Error(res.error);
  await openBillingUrl(res.url);
  return "checkout";
}

/** MANAGE ELITE — the Wix members area where the plan can be viewed or cancelled. */
export async function openEliteManagement(): Promise<void> {
  if (IS_NATIVE_BUILD) {
    const res = await nativePost<{ url: string }>("/api/public/mobile/elite/portal", {});
    await openBillingUrl(res.url);
    return;
  }
  const state = await getEliteEntitlement();
  window.open(state.manageUrl, "_blank");
}

/** Server-truth membership refresh (post-checkout, on resume, self-heal). */
export async function refreshMembership(): Promise<MembershipState> {
  if (IS_NATIVE_BUILD) {
    return await nativePost<MembershipState>("/api/public/mobile/elite/status", {});
  }
  return (await syncEliteMembership()) as MembershipState;
}
