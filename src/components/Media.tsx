import { useMediaUrl } from "@/lib/media";

/**
 * Renders media stored in a private bucket. The stored value is a storage
 * reference; a short-lived signed URL is fetched on demand.
 */
export function MediaImage({
  src,
  alt,
  className,
  loading,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fallback?: React.ReactNode;
}) {
  const { data: url } = useMediaUrl(src);
  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} className={className} loading={loading} />;
}

export function MediaVideo({ src, className }: { src?: string | null; className?: string }) {
  const { data: url } = useMediaUrl(src);
  if (!url) return <div className={className} />;
  return <video src={url} className={className} playsInline muted loop controls preload="metadata" />;
}
