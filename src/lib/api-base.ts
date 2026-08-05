/**
 * Base origin for server-side API calls.
 *
 * - Web (SSR) build: empty string, so every request stays same-origin exactly
 *   as it does today.
 * - Capacitor build: set via `VITE_API_BASE_URL` at build time, because the
 *   native webview is served from `capacitor://localhost` and has no server of
 *   its own. All server functions, `/api/*` routes and Lovable asset URLs are
 *   pointed at the published site instead.
 */
export const API_BASE_URL: string = (import.meta.env["VITE_API_BASE_URL"] ?? "")
  .toString()
  .replace(/\/+$/, "");

/** True when this bundle runs inside the native shell (static build). */
export const IS_NATIVE_BUILD = API_BASE_URL !== "";

/** Absolutise an app-relative URL when running in the native shell. */
export function apiUrl(path: string): string {
  if (!API_BASE_URL || !path.startsWith("/")) return path;
  return `${API_BASE_URL}${path}`;
}

const PROXIED_PREFIXES = ["/_serverFn", "/api/", "/__l5e/"];

function shouldProxy(path: string): boolean {
  return PROXIED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

let installed = false;

/**
 * Rewrites relative server-function / API requests to the published site when
 * running inside the native shell. No-op on the web build.
 */
export function installApiProxy(): void {
  if (installed || !IS_NATIVE_BUILD) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (typeof input === "string" && shouldProxy(input)) {
        return originalFetch(apiUrl(input), init);
      }
      if (input instanceof URL && input.origin === window.location.origin && shouldProxy(input.pathname)) {
        return originalFetch(apiUrl(input.pathname + input.search), init);
      }
      if (typeof Request !== "undefined" && input instanceof Request) {
        const url = new URL(input.url);
        if (url.origin === window.location.origin && shouldProxy(url.pathname)) {
          return originalFetch(new Request(apiUrl(url.pathname + url.search), input), init);
        }
      }
    } catch {
      // fall through to the untouched request
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}
