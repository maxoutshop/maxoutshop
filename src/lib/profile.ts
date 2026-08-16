import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { makeStorageRef } from "@/lib/media";

export type ProfileLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
};

export type SetLite = { id: string; exercise: string; weight: number | null; reps: number | null; set_index: number };
export type PublicWorkout = {
  id: string;
  user_id: string;
  title: string | null;
  category: string;
  notes: string | null;
  duration_min: number | null;
  performed_at: string;
  is_public: boolean;
  workout_sets: SetLite[];
};

const WORKOUT_COLS =
  "id, user_id, title, category, notes, duration_min, performed_at, is_public, workout_sets(id, exercise, weight, reps, set_index)";

/** Workouts shown on a profile. Own profile shows everything, others only public. */
export function useProfileWorkouts(athleteId?: string, isMe = false) {
  return useQuery({
    queryKey: ["profile-workouts", athleteId, isMe],
    enabled: !!athleteId,
    queryFn: async () => {
      let req = supabase.from("workouts").select(WORKOUT_COLS).eq("user_id", athleteId!);
      if (!isMe) req = req.eq("is_public", true);
      const { data, error } = await req.order("performed_at", { ascending: false }).limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as PublicWorkout[];
    },
  });
}

export function useToggleWorkoutVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workoutId, isPublic }: { workoutId: string; isPublic: boolean }) => {
      const { error } = await supabase.from("workouts").update({ is_public: isPublic }).eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-workouts"] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

/* ---------- Workout likes + comments ---------- */

export function useWorkoutLikes(workoutId?: string) {
  return useQuery({
    queryKey: ["workout-likes", workoutId],
    enabled: !!workoutId,
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_likes").select("user_id").eq("workout_id", workoutId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id as string);
    },
  });
}

export function useToggleWorkoutLike(uid?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workoutId, liked }: { workoutId: string; liked: boolean }) => {
      if (!uid) throw new Error("Sign in to react");
      if (liked) {
        const { error } = await supabase.from("workout_likes").insert({ workout_id: workoutId, user_id: uid });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("workout_likes")
          .delete()
          .eq("workout_id", workoutId)
          .eq("user_id", uid);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-likes"] }),
  });
}

export function useWorkoutComments(workoutId?: string, enabled = true) {
  return useQuery({
    queryKey: ["workout-comments", workoutId],
    enabled: !!workoutId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_comments")
        .select("id, body, created_at, user_id, profiles(display_name, username, avatar_url)")
        .eq("workout_id", workoutId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddWorkoutComment(uid?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workoutId, body }: { workoutId: string; body: string }) => {
      if (!uid) throw new Error("Sign in to comment");
      const { error } = await supabase
        .from("workout_comments")
        .insert({ workout_id: workoutId, user_id: uid, body: body.trim().slice(0, 500) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-comments"] }),
  });
}

/* ---------- Featured PRs ---------- */

export const MAX_FEATURED_PRS = 3;

export function useToggleFeaturedPR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prId, featured }: { prId: string; featured: boolean }) => {
      const { error } = await supabase.from("personal_records").update({ featured }).eq("id", prId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prs"] }),
  });
}

/* ---------- Cover photo ---------- */

export async function uploadCover(userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/cover-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (upErr) throw upErr;
  const ref = makeStorageRef("avatars", path);
  const { error } = await supabase.from("profiles").update({ cover_url: ref }).eq("id", userId);
  if (error) throw error;
  return ref;
}

/* ---------- Follower / following lists ---------- */

const ATHLETE_COLS = "id, username, display_name, avatar_url, verified, is_elite";

export function useFollowList(userId?: string, mode: "followers" | "following" = "followers", enabled = true) {
  return useQuery({
    queryKey: ["follow-list", userId, mode],
    enabled: !!userId && enabled,
    queryFn: async () => {
      const col = mode === "followers" ? "following_id" : "follower_id";
      const other = mode === "followers" ? "follower_id" : "following_id";
      const { data, error } = await supabase.from("follows").select(other).eq(col, userId!).limit(200);
      if (error) throw error;
      const ids = (data ?? []).map((r) => (r as Record<string, string>)[other]!);
      if (!ids.length) return [];
      const { data: people, error: pErr } = await supabase.from("profiles").select(ATHLETE_COLS).in("id", ids);
      if (pErr) throw pErr;
      return people ?? [];
    },
  });
}

/* ---------- Training streak ---------- */

export function streakFromWorkouts(dates: string[]) {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cur = new Date();
  // Allow today to be a rest day without breaking the streak.
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
