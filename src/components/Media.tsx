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

/** Circular athlete avatar with an initials fallback. */
export function Avatar({
  src,
  name,
  className = "h-10 w-10",
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  const letters = (name ?? "?")
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-full border border-border bg-surface ${className}`}>
      <span className="grid h-full w-full place-items-center text-[11px] font-semibold text-muted-foreground">{letters}</span>
      {src && (
        <MediaImage src={src} alt={name ?? "Athlete"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
    </span>
  );
}
