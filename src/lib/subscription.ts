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

  const sub = query.data;
  const periodOk = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
  const isElite = !!sub && periodOk && ["active", "trialing", "past_due", "canceled"].includes(sub.status);

  return { ...query, subscription: sub, isElite, pastDue: sub?.status === "past_due" };
}
