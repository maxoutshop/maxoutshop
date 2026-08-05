// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `npm run build:mobile` sets MOBILE_BUILD=1 to produce a client-only SPA bundle
// for the Capacitor shell. The web (SSR) build is completely unaffected.
const isMobileBuild = process.env["MOBILE_BUILD"] === "1";

export default defineConfig({
  // Nitro (Cloudflare worker) output is meaningless for a native shell.
  nitro: isMobileBuild ? false : undefined,
  tanstackStart: isMobileBuild
    ? {
        // Client-only shell: renders <html> once at build time and hydrates
        // the router in the browser, so every route works without a server.
        spa: {
          enabled: true,
          prerender: {
            outputPath: "/index.html",
            crawlLinks: false,
          },
        },
      }
    : {
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this
        server: { entry: "server" },
      },
});
