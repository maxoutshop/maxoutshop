import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AthleteLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean | null;
  is_elite: boolean | null;
};

const ATHLETE_COLS = "id, username, display_name, avatar_url, verified, is_elite";

/** Search athletes by handle or display name. Empty query returns suggestions. */
export function useAthleteSearch(query: string, uid?: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["athlete-search", q, uid],
    enabled: !!uid,
    queryFn: async () => {
      let req = supabase.from("profiles").select(ATHLETE_COLS).limit(25);
      if (q) req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      else req = req.order("updated_at", { ascending: false });
      const { data, error } = await req;
      if (error) throw error;
      return ((data ?? []) as AthleteLite[]).filter((p) => p.id !== uid);
    },
  });
}

/** Everyone the user follows (ids). */
export function useFollowing(uid?: string) {
  return useQuery({
    queryKey: ["following", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", uid!);
      if (error) throw error;
      return (data ?? []).map((r) => r.following_id);
    },
  });
}

export function useFollowCounts(userId?: string) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
      ]);
      return { followers: followers.count ?? 0, following: following.count ?? 0 };
    },
  });
}

export function useToggleFollow(uid?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, follow }: { targetId: string; follow: boolean }) => {
      if (!uid) throw new Error("Sign in first.");
      if (follow) {
        const { error } = await supabase.from("follows").insert({ follower_id: uid, following_id: targetId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", targetId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["follow-counts"] });
    },
  });
}

export type Conversation = {
  other: AthleteLite;
  lastBody: string;
  lastAt: string;
  unread: number;
  fromMe: boolean;
};

/** Inbox: latest message per conversation partner. */
export function useConversations(uid?: string) {
  return useQuery({
    queryKey: ["conversations", uid],
    enabled: !!uid,
    refetchInterval: 15000,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = data ?? [];
      const ids = new Set<string>();
      for (const m of rows) ids.add(m.sender_id === uid ? m.recipient_id : m.sender_id);
      if (ids.size === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select(ATHLETE_COLS).in("id", [...ids]);
      const byId = new Map((profiles ?? []).map((p) => [(p as AthleteLite).id, p as AthleteLite]));

      const map = new Map<string, Conversation>();
      for (const m of rows) {
        const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id;
        const existing = map.get(otherId);
        const unreadBump = m.recipient_id === uid && !m.read_at ? 1 : 0;
        if (!existing) {
          const other = byId.get(otherId);
          if (!other) continue;
          map.set(otherId, {
            other,
            lastBody: m.body,
            lastAt: m.created_at,
            unread: unreadBump,
            fromMe: m.sender_id === uid,
          });
        } else {
          existing.unread += unreadBump;
        }
      }
      return [...map.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    },
  });
}

export function useUnreadCount(uid?: string) {
  return useQuery({
    queryKey: ["unread-dms", uid],
    enabled: !!uid,
    refetchInterval: 20000,
    queryFn: async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", uid!)
        .is("read_at", null);
      return count ?? 0;
    },
  });
}

export function useThread(uid?: string, otherId?: string) {
  return useQuery({
    queryKey: ["thread", uid, otherId],
    enabled: !!uid && !!otherId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${uid},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${uid})`,
        )
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      const unread = (data ?? []).filter((m) => m.recipient_id === uid && !m.read_at).map((m) => m.id);
      if (unread.length) {
        await supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
      return data ?? [];
    },
  });
}

export function useSendMessage(uid?: string, otherId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!uid || !otherId) throw new Error("Missing recipient.");
      const text = body.trim().slice(0, 1000);
      if (!text) return;
      const { error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: uid, recipient_id: otherId, body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", uid, otherId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
