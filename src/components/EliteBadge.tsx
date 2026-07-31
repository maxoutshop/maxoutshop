import { Crown } from "lucide-react";

export function EliteBadge({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span title="MAXOUT ELITE" aria-label="MAXOUT ELITE member" className="inline-flex">
      <Crown className={`${className} fill-foreground text-foreground`} />
    </span>
  );
}
