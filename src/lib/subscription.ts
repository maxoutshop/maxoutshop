import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

function env() {
  try {
    return getStripeEnvironment();
  } catch {
    return null;
  }
}

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
  const periodOk = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
  const paid = !!sub && periodOk && ["active", "trialing", "past_due", "canceled"].includes(sub.status);

  const comp = grant.data;
  const compActive = !!comp && (!comp.expires_at || new Date(comp.expires_at) > new Date());

  return {
    ...query,
    subscription: sub,
    grant: compActive ? comp : null,
    isElite: paid || compActive,
    pastDue: sub?.status === "past_due",
  };
}

