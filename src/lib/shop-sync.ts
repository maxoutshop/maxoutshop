import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Account-synced shop state. Everything is keyed to the signed-in user and
 * protected by owner-only RLS, so wishlists and size preferences follow the
 * athlete across web and the iOS app.
 */

export function useWishlist(userId?: string) {
  return useQuery({
    queryKey: ["wishlist", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, slug, preferred_size, preferred_color, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function toggleWishlist(
  userId: string,
  slug: string,
  opts?: { size?: string | null; color?: string | null; on?: boolean },
) {
  const { data: existing, error } = await supabase
    .from("wishlist_items").select("id").eq("user_id", userId).eq("slug", slug).maybeSingle();
  if (error) throw error;

  const shouldAdd = opts?.on ?? !existing;
  if (!shouldAdd) {
    if (existing) {
      const { error: dErr } = await supabase.from("wishlist_items").delete().eq("id", existing.id);
      if (dErr) throw dErr;
    }
    return false;
  }
  if (existing) return true;

  const { error: iErr } = await supabase.from("wishlist_items").insert({
    user_id: userId, slug,
    preferred_size: opts?.size ?? null, preferred_color: opts?.color ?? null,
  });
  if (iErr && iErr.code !== "23505") throw iErr;
  return true;
}

export function useRecentlyViewed(userId?: string) {
  return useQuery({
    queryKey: ["recently-viewed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recently_viewed")
        .select("slug, viewed_at")
        .eq("user_id", userId!)
        .order("viewed_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Fire-and-forget: never block a product page on this. */
export async function trackView(userId: string | undefined, slug: string) {
  if (!userId) return;
  await supabase
    .from("recently_viewed")
    .upsert({ user_id: userId, slug, viewed_at: new Date().toISOString() }, { onConflict: "user_id,slug" })
    .then(({ error }) => { if (error) console.error("[shop] view", error.message); });
}

export function useShopPrefs(userId?: string) {
  return useQuery({
    queryKey: ["shop-prefs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_preferences").select("preferred_sizes").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return { preferred_sizes: (data?.preferred_sizes ?? []) as string[] };
    },
  });
}

export async function saveShopPrefs(userId: string, sizes: string[]) {
  const { error } = await supabase
    .from("shop_preferences")
    .upsert({ user_id: userId, preferred_sizes: sizes, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export function useStockWatches(userId?: string) {
  return useQuery({
    queryKey: ["stock-watches", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_watches")
        .select("id, slug, size, color, last_seen_available, notified_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function watchStock(userId: string, slug: string, size?: string | null, color?: string | null) {
  const { error } = await supabase.from("stock_watches").insert({
    user_id: userId, slug, size: size ?? null, color: color ?? null,
  });
  if (error && error.code !== "23505") throw error;
}

export async function unwatchStock(userId: string, id: string) {
  const { error } = await supabase.from("stock_watches").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
