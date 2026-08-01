import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Private-bucket media handling.
 *
 * Stored values are storage references ("storage:<bucket>:<path>") — never a
 * signed URL. Signed URLs are minted on demand with a short TTL so a leaked
 * link stops working quickly instead of granting access for years.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type StorageRef = { bucket: string; path: string };

export function makeStorageRef(bucket: string, path: string) {
  return `storage:${bucket}:${path}`;
}

/** Parses a storage reference, or a legacy signed URL still stored in the DB. */
export function parseStorageRef(value?: string | null): StorageRef | null {
  if (!value) return null;
  if (value.startsWith("storage:")) {
    const rest = value.slice("storage:".length);
    const idx = rest.indexOf(":");
    if (idx <= 0) return null;
    return { bucket: rest.slice(0, idx), path: rest.slice(idx + 1) };
  }
  // Legacy: a previously stored signed URL — re-sign it short-lived instead.
  const match = value.match(/\/storage\/v1\/object\/sign\/([^/?]+)\/([^?]+)/);
  if (match) return { bucket: match[1]!, path: decodeURIComponent(match[2]!) };
  return null;
}

export async function resolveMediaUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  const ref = parseStorageRef(value);
  if (!ref) return value; // plain external URL (e.g. admin-entered challenge image)
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Resolves a stored media value to a short-lived, cached signed URL. */
export function useMediaUrl(value?: string | null) {
  const ref = parseStorageRef(value);
  return useQuery({
    queryKey: ["media-url", value ?? null],
    enabled: !!value,
    queryFn: () => resolveMediaUrl(value),
    // Refresh well before the signed URL expires.
    staleTime: (SIGNED_URL_TTL_SECONDS - 300) * 1000,
    gcTime: SIGNED_URL_TTL_SECONDS * 1000,
    initialData: value && !ref ? value : undefined,
  });
}

export function isVideoRef(value?: string | null) {
  if (!value) return false;
  const clean = value.split("?")[0]!.toLowerCase();
  return /\.(mp4|webm|mov|m4v|quicktime)$/.test(clean);
}
