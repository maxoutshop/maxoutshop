import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import splashAsset from "@/assets/maxout-splash.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/api-base";

/**
 * Pre-app splash screen: shows the MAXOUT logo on a dark background with a
 * subtle progress bar that reflects real preload work (splash art, webfonts,
 * auth session, first data queries) rather than a fixed timer.
 */
export function SplashScreen({
  children,
  minimumMs = 700,
  maximumMs = 6000,
  fadeOutMs = 900,
}: {
  children: React.ReactNode;
  minimumMs?: number;
  maximumMs?: number;
  fadeOutMs?: number;
}) {
  const splashUrl = apiUrl(splashAsset.url);
  const [phase, setPhase] = useState<"showing" | "fading" | "done">("showing");
  const [progress, setProgress] = useState(0);

  // Real signals
  const [imageReady, setImageReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const isFetching = useIsFetching();
  const sawFetchRef = useRef(false);
  if (isFetching > 0) sawFetchRef.current = true;
  // Data is "ready" once queries that started have all settled.
  const dataReady = authReady && (sawFetchRef.current ? isFetching === 0 : true);

  // Splash artwork
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageReady(true);
    img.onerror = () => setImageReady(true);
    img.src = splashUrl;
    if (img.complete) setImageReady(true);
  }, []);

  // Webfonts
  useEffect(() => {
    let cancelled = false;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auth session hydration
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .catch(() => null)
      .then(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Minimum on-screen time so the splash never flickers
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minimumMs);
    return () => clearTimeout(t);
  }, [minimumMs]);

  // Hard cap: never hold the app hostage
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), maximumMs);
    return () => clearTimeout(t);
  }, [maximumMs]);

  // Weighted progress from real signals, with a slow drift so it never stalls
  const target =
    (imageReady ? 30 : 0) + (fontsReady ? 20 : 0) + (authReady ? 25 : 0) + (dataReady ? 25 : 0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        const ceiling = Math.max(target, Math.min(p + 1.5, 92));
        if (p >= ceiling) return p;
        return p + Math.max(0.6, (ceiling - p) * 0.18);
      });
    }, 60);
    return () => clearInterval(id);
  }, [target]);

  const complete = (imageReady && fontsReady && dataReady && minElapsed) || timedOut;

  useEffect(() => {
    if (!complete || phase !== "showing") return;
    setProgress(100);
    const t = setTimeout(() => {
      setPhase("fading");
      setTimeout(() => setPhase("done"), fadeOutMs);
    }, 220);
    return () => clearTimeout(t);
  }, [complete, phase, fadeOutMs]);

  if (phase === "done") return children;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ease-out"
        style={{
          opacity: phase === "showing" ? 1 : 0,
          pointerEvents: phase === "showing" ? "auto" : "none",
        }}
        role="status"
        aria-live="polite"
        aria-label="MAXOUT loading"
      >
        <img
          src={splashUrl}
          alt="MAXOUT"
          className="h-auto max-h-[85vh] w-auto max-w-[85vw] select-none object-contain opacity-95"
          draggable={false}
        />
        <div className="absolute bottom-24 left-1/2 w-40 -translate-x-1/2">
          <div className="h-px w-full overflow-hidden bg-white/15">
            <div
              className="h-full bg-white/80 transition-[width] duration-200 ease-out"
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          </div>
        </div>
      </div>
      <div className="invisible">{children}</div>
    </>
  );
}
