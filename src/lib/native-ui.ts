import { IS_NATIVE_BUILD } from "./api-base";

let installed = false;

/**
 * Native-only WKWebView hardening: locks the viewport scale, marks <html> so
 * native-only CSS can apply, and blocks pinch/double-tap zoom gestures that
 * make the Capacitor app get stuck zoomed in. No-op on the web build, so the
 * responsive/accessible browser experience is unchanged.
 */
export function installNativeUi(): void {
  if (installed || !IS_NATIVE_BUILD) return;
  if (typeof document === "undefined") return;
  installed = true;

  document.documentElement.classList.add("native-app");

  const meta =
    document.querySelector<HTMLMetaElement>('meta[name="viewport"]') ??
    document.head.appendChild(Object.assign(document.createElement("meta"), { name: "viewport" }));
  meta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  );

  // Safari pinch-zoom gestures inside the webview.
  const blockGesture = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", blockGesture, { passive: false });
  document.addEventListener("gesturechange", blockGesture, { passive: false });
  document.addEventListener("gestureend", blockGesture, { passive: false });

  // Double-tap zoom: swallow the second tap only, scrolling stays untouched.
  let lastTouch = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    },
    { passive: false },
  );

  // Multi-touch pinch on elements that ignore touch-action.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}
