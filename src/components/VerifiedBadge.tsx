import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verified account"
      className={`shrink-0 fill-foreground text-background ${className}`}
    />
  );
}
