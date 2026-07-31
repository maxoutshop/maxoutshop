import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const today = () => new Date().toISOString().slice(0, 10);

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayMeals(userId?: string) {
  return useQuery({
    queryKey: ["meals", userId, today()],
    enabled: !!userId,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .gte("logged_at", start.toISOString())
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWater(userId?: string) {
  return useQuery({
    queryKey: ["water", userId, today()],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("water_logs").select("*").eq("day", today()).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkouts(userId?: string) {
  return useQuery({
    queryKey: ["workouts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*, workout_sets(*)")
        .order("performed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePRs(userId?: string) {
  return useQuery({
    queryKey: ["prs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .order("achieved_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWeights(userId?: string) {
  return useQuery({
    queryKey: ["weights", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics")
        .select("*")
        .order("logged_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").order("ends_on", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyChallenges(userId?: string) {
  return useQuery({
    queryKey: ["my-challenges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_participants").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePosts(userId?: string) {
  return useQuery({
    queryKey: ["posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(display_name, username, avatar_url), post_likes(user_id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePoints(userId?: string) {
  return useQuery({
    queryKey: ["points", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export async function awardPoints(userId: string, delta: number, reason: string) {
  await supabase.from("points_ledger").insert({ user_id: userId, delta, reason });
}

export function useMutate<TVars>(fn: (vars: TVars) => Promise<unknown>, keys: string[]) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(...keys),
  });
}
