import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Small, premium page transition: each route change re-mounts the wrapper
 * (keyed by pathname) so the new screen fades + lifts in briefly.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
