import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IS_NATIVE_BUILD } from "@/lib/api-base";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

function env() {
  try {
    return getStripeEnvironment();
  } catch {
    return null;
  }
}

/** Access rules: active/trialing grant access; a canceled sub keeps access until
 *  the period ends; a failed payment (past_due/unpaid) revokes access immediately. */
export function useElite(userId?: string) {
  const environment = env();
  const query = useQuery({
    queryKey: ["subscription", userId, environment],
    enabled: !!userId && !!environment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .eq("environment", environment!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const grant = useQuery({
    queryKey: ["elite-grant", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_grants")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sub = query.data;
  const future = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
  const paid =
    !!sub &&
    ((["active", "trialing"].includes(sub.status) && future) ||
      (sub.status === "canceled" && !!sub.current_period_end && new Date(sub.current_period_end) > new Date()));

  const comp = grant.data;
  const compActive = !!comp && (!comp.expires_at || new Date(comp.expires_at) > new Date());

  const paymentFailed = !!sub && ["past_due", "unpaid", "incomplete"].includes(sub.status);

  return {
    ...query,
    loading: query.isLoading || grant.isLoading,
    subscription: sub,
    grant: compActive ? comp : null,
    /** Comped via promo code and not paying — hide billing management. */
    comped: compActive && !paid,
    isElite: paid || compActive,
    paymentFailed,
    /** Access was cut because the renewal payment failed. */
    lockedForPayment: paymentFailed && !compActive,
  };
}

/**
 * Keeps entitlement honest with the server: refreshes from Stripe when the page
 * mounts, when the tab regains focus, and when the native app resumes (e.g.
 * after returning from Stripe Checkout in the in-app browser).
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
        await refreshMembership();
        if (!disposed) {
          await qc.invalidateQueries({ queryKey: ["subscription"] });
          await qc.invalidateQueries({ queryKey: ["elite-grant"] });
        }
      } catch {
        // Offline or Stripe hiccup — the cached server state stays in place.
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
