import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IS_NATIVE_BUILD } from "@/lib/api-base";
import { getEliteEntitlement } from "@/utils/elite.functions";
import type { MembershipState } from "@/lib/elite-client";

export type Entitlement = MembershipState;

const EMPTY: Entitlement = {
  isElite: false,
  source: "none",
  plan: null,
  planName: null,
  status: null,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  manageUrl: "https://www.maxoutshop.com/account/my-subscriptions",
  linked: false,
};

/**
 * THE single ELITE entitlement source for the whole app.
 *
 * Billing lives in Wix Pricing Plans; the server mirrors it into
 * `wix_memberships` and answers here. The client never decides who is ELITE —
 * every sensitive feature re-checks server-side as well.
 */
export function useElite(userId?: string) {
  const query = useQuery({
    queryKey: ["entitlement", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => (await getEliteEntitlement()) as Entitlement,
  });

  const e = query.data ?? EMPTY;

  return {
    ...query,
    loading: query.isLoading,
    entitlement: e,
    isElite: e.isElite,
    source: e.source,
    plan: e.plan,
    planName: e.planName,
    status: e.status,
    expiresAt: e.expiresAt,
    cancelAtPeriodEnd: e.cancelAtPeriodEnd,
    manageUrl: e.manageUrl,
    /** Comped via promo code / admin grant — no Wix billing to manage. */
    comped: e.source === "grant",
    /** Kept for older call sites; Wix plans have no "payment failed" lockout state. */
    lockedForPayment: false,
    paymentFailed: false,
  };
}

/**
 * Keeps entitlement honest with the server: re-verifies against Wix when the
 * page mounts, when the tab regains focus, and when the native app resumes
 * (e.g. after returning from the Wix hosted plan checkout).
 */
export function useMembershipSync(userId?: string) {
  const qc = useQueryClient();
  const last = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let removeNative: (() => void) | undefined;

    const run = async (force = false) => {
      const now = Date.now();
      if (!force && now - last.current < 20_000) return;
      last.current = now;
      try {
        const { refreshMembership } = await import("@/lib/elite-client");
        const state = await refreshMembership();
        if (!disposed) {
          qc.setQueryData(["entitlement", userId], state);
          await qc.invalidateQueries({ queryKey: ["entitlement"] });
        }
      } catch {
        // Offline or Wix hiccup — the mirrored server state stays in place.
      }
    };

    void run(true);

    const onFocus = () => void run();
    window.addEventListener("focus", onFocus);

    if (IS_NATIVE_BUILD) {
      void (async () => {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void run(true);
        });
        removeNative = () => void handle.remove();
      })();
    }

    return () => {
      disposed = true;
      window.removeEventListener("focus", onFocus);
      removeNative?.();
    };
  }, [userId, qc]);
}
