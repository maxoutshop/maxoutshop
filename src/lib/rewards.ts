import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Reward = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  points_cost: number;
  active: boolean;
  stock: number | null;
};

export type Redemption = {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  rewards?: { title: string } | null;
};

/**
 * Balance is ALWAYS read from profiles.points, which only the database
 * trigger on points_ledger can change. The client never computes it.
 */
export function usePointsSummary(userId?: string) {
  return useQuery({
    queryKey: ["points-summary", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile, error: pErr }, { data: ledger, error: lErr }] = await Promise.all([
        supabase.from("profiles").select("points").eq("id", userId!).maybeSingle(),
        supabase.from("points_ledger").select("id, delta, reason, created_at, event_key")
          .eq("user_id", userId!).order("created_at", { ascending: false }).limit(50),
      ]);
      if (pErr) throw pErr;
      if (lErr) throw lErr;
      const rows = ledger ?? [];
      return {
        balance: profile?.points ?? 0,
        lifetime: rows.filter((r) => r.delta > 0).reduce((a, r) => a + r.delta, 0),
        ledger: rows,
      };
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards").select("*").order("points_cost", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reward[];
    },
  });
}

export function useRedemptions(userId?: string) {
  return useQuery({
    queryKey: ["redemptions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("id, reward_id, points_spent, status, admin_notes, created_at, rewards(title)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Redemption[];
    },
  });
}

/**
 * Redemption runs entirely inside a security-definer SQL routine that locks
 * the profile row, verifies the balance, writes the redemption and the
 * negative ledger entry together, and decrements stock. The client cannot
 * deduct points itself.
 */
export async function redeemReward(rewardId: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_reward", { _reward_id: rewardId });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
  return data as string;
}

export const EARN_RULES = [
  { label: "Finish a workout", points: 25 },
  { label: "Set a new personal record", points: 50 },
  { label: "Complete a challenge", points: "Varies by challenge" },
];
