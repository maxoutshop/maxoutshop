import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { makeStorageRef, isVideoRef } from "@/lib/media";

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

export function useRoles(userId?: string) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
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

/** Meals for today + yesterday, so the tracker can show both days. */
export function useRecentMeals(userId?: string) {
  return useQuery({
    queryKey: ["meals", userId, "recent", today()],
    enabled: !!userId,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 1);
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
        .eq("user_id", userId!)
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
        .eq("user_id", userId!)
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
        .select("*, profiles(display_name, username, avatar_url, is_ambassador, verified, is_elite), post_likes(user_id), post_comments(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useComments(postId?: string, enabled = true) {
  return useQuery({
    queryKey: ["comments", postId],
    enabled: !!postId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, profiles(display_name, username, avatar_url)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
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

export function useAthletes(userId?: string) {
  return useQuery({
    queryKey: ["athletes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, is_ambassador, verified, is_elite")
        .order("updated_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------- Public athlete profiles ---------- */

export function useProfileByUsername(username?: string) {
  return useQuery({
    queryKey: ["profile-by-username", username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_ambassador, verified, is_elite, created_at")
        .eq("username", username!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUserPosts(userId?: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(display_name, username, avatar_url, is_ambassador, verified, is_elite), post_likes(user_id), post_comments(id)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCheers(userId?: string) {
  return useQuery({
    queryKey: ["cheers", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cheers")
        .select("*, profiles(display_name, username, avatar_url)")
        .eq("to_user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (upErr) throw upErr;
  // Store a storage reference, not a signed URL — short-lived URLs are minted on demand.
  const ref = makeStorageRef("avatars", path);
  const { error: pErr } = await supabase.from("profiles").update({ avatar_url: ref }).eq("id", userId);
  if (pErr) throw pErr;
  return ref;
}

export const MAX_POST_MEDIA_MB = 50;

export function isVideoUrl(url?: string | null) {
  return isVideoRef(url);
}

export async function uploadPostMedia(userId: string, file: File) {
  if (file.size > MAX_POST_MEDIA_MB * 1024 * 1024) {
    throw new Error(`File is too large — keep it under ${MAX_POST_MEDIA_MB}MB.`);
  }
  const isVideo = file.type.startsWith("video");
  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
  const path = `${userId}/post-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, {
    upsert: true,
    contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
  });
  if (upErr) throw upErr;
  return makeStorageRef("post-media", path);
}

