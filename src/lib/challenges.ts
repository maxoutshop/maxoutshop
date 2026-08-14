import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CHALLENGE_METRICS = [
  { value: "workout_count", label: "Workouts completed", unit: "workouts" },
  { value: "total_sets", label: "Total sets", unit: "sets" },
  { value: "total_volume", label: "Training volume", unit: "lb" },
  { value: "pr_count", label: "Personal records", unit: "PRs" },
  { value: "bodyweight_logs", label: "Bodyweight logs", unit: "days" },
  { value: "workout_streak", label: "Workout streak", unit: "days" },
] as const;

export function metricLabel(metric: string) {
  return CHALLENGE_METRICS.find((m) => m.value === metric)?.label ?? metric;
}
export function metricUnit(metric: string) {
  return CHALLENGE_METRICS.find((m) => m.value === metric)?.unit ?? "";
}

export type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  goal_label: string | null;
  metric: string;
  target_value: number;
  starts_on: string;
  ends_on: string | null;
  reward_points: number;
  image_url: string | null;
  active: boolean;
};

export type Participation = {
  id: string;
  challenge_id: string;
  progress: number;
  completed_at: string | null;
  reward_claimed_at: string | null;
};

/**
 * Progress is never sent by the client. `sync_challenge_progress` recomputes
 * every joined challenge from the user's real workouts/sets/PRs/bodyweight
 * logs inside the challenge window, marks completion once, and awards the
 * reward exactly once through the idempotent points event key.
 */
export async function syncChallengeProgress() {
  const { error } = await supabase.rpc("sync_challenge_progress", {});
  if (error) console.error("[challenges] sync failed", error.message);
}

export function useChallengeBoard(userId?: string) {
  return useQuery({
    queryKey: ["challenge-board", userId],
    enabled: !!userId,
    queryFn: async () => {
      await syncChallengeProgress();
      const [{ data: challenges, error: cErr }, { data: mine, error: mErr }] = await Promise.all([
        supabase.from("challenges").select("*").order("ends_on", { ascending: true }),
        supabase.from("challenge_participants").select("*").eq("user_id", userId!),
      ]);
      if (cErr) throw cErr;
      if (mErr) throw mErr;
      return {
        challenges: (challenges ?? []) as unknown as ChallengeRow[],
        mine: (mine ?? []) as unknown as Participation[],
      };
    },
  });
}

/** Leaderboard for one challenge: rank, athlete, progress. */
export function useLeaderboard(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge-leaderboard", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("id, user_id, progress, completed_at")
        .eq("challenge_id", challengeId!)
        .order("progress", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, verified, is_elite")
        .in("id", rows.map((r) => r.user_id));
      if (pErr) throw pErr;

      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r, i) => ({ ...r, rank: i + 1, profile: byId.get(r.user_id) ?? null }));
    },
  });
}

export async function joinChallenge(userId: string, challengeId: string) {
  const { error } = await supabase
    .from("challenge_participants")
    .insert({ user_id: userId, challenge_id: challengeId, progress: 0 });
  if (error && error.code !== "23505") throw error;
  await syncChallengeProgress();
}

export async function leaveChallenge(userId: string, challengeId: string) {
  const { error } = await supabase
    .from("challenge_participants").delete().eq("user_id", userId).eq("challenge_id", challengeId);
  if (error) throw error;
}

export function daysRemaining(endsOn: string | null): number | null {
  if (!endsOn) return null;
  return Math.max(0, Math.ceil((new Date(endsOn).getTime() - Date.now()) / 864e5));
}
