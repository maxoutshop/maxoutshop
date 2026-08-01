import { useEffect, useState } from "react";
import splashAsset from "@/assets/maxout-splash.png.asset.json";

/**
 * Pre-app splash screen: shows the MAXOUT logo on a dark background and
 * fades out before the app is revealed. It renders once per full page load
 * and never re-appears during client-side navigation.
 */
export function SplashScreen({
  children,
  minimumMs = 2200,
  fadeOutMs = 900,
}: {
  children: React.ReactNode;
  minimumMs?: number;
  fadeOutMs?: number;
}) {
  const [phase, setPhase] = useState<"showing" | "fading" | "done">("showing");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("fading");
      setTimeout(() => setPhase("done"), fadeOutMs);
    }, minimumMs);

    return () => clearTimeout(timer);
  }, [minimumMs, fadeOutMs]);

  if (phase === "done") return children;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-700 ease-out"
        style={{
          opacity: phase === "showing" ? 1 : 0,
          pointerEvents: phase === "showing" ? "auto" : "none",
        }}
        aria-label="MAXOUT loading screen"
        role="img"
      >
        <img
          src={splashAsset.url}
          alt="MAXOUT"
          className="h-auto max-h-[85vh] w-auto max-w-[85vw] select-none object-contain opacity-95"
          draggable={false}
        />
      </div>
      <div className="invisible">{children}</div>
    </>
  );
}
