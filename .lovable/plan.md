# Capacitor static build mode for MAXOUT

Goal: produce a native-ready static bundle (`dist/` with a real `index.html`) for the iOS/Android shell, while the existing SSR web deployment keeps building and behaving exactly as today. The mobile app ships UI only; all server logic keeps running on the published site `https://maxoutshop.lovable.app`.

## How it will work

```text
build:web    -> current SSR build (unchanged output, unchanged deploy)
build:mobile -> SPA/static build -> dist/index.html + assets -> Capacitor
                 |
                 +-- all server calls go to https://maxoutshop.lovable.app
```

The app currently has 28 server functions across Wix catalog/checkout, Stripe, AI food logging + trainer, promo codes, push, and the admin console. None of them are rewritten. In the mobile build the browser-side call simply points at the published site instead of its own origin, so features behave identically.

## What gets added

1. **Mobile build mode**
   - `vite.config.ts` gains a mobile branch (triggered by an env flag) that turns off SSR/prerender and builds a client-only SPA shell.
   - A small build script runs that build and copies the client output into a top-level `dist/` folder, then verifies `dist/index.html` exists and references the hashed asset bundle. The web build's output path is untouched.

2. **npm scripts**
   - `build:web` — the current SSR build (`vite build`).
   - `build:mobile` — static build + copy into `dist/`.
   - Existing `build`, `build:dev`, `dev` stay as they are so Lovable deploys are unaffected.

3. **API base for the native shell**
   - New `src/lib/api-base.ts` exposing the API origin from `VITE_API_BASE_URL` (empty on web = same origin, `https://maxoutshop.lovable.app` for the mobile build).
   - A tiny client-side fetch shim, installed only when an API base is set, rewrites relative `/_serverFn/*` and `/api/*` requests to that absolute origin. Supabase, Stripe and image/signed-URL calls are already absolute and unaffected.

4. **Cross-origin access on the published site**
   - `src/start.ts`: allow the Capacitor webview origins (`capacitor://localhost`, `ionic://localhost`, `http://localhost`) — CSRF check skipped for those specific origins only, plus CORS headers and an OPTIONS preflight response. Every other origin keeps the current CSRF protection.
   - Auth is unchanged: the Supabase bearer token is already attached to every server-function call.

5. **Capacitor in the repo**
   - Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
   - `capacitor.config.ts` with appName `MAXOUT`, appId `com.maxout.app`, `webDir: "dist"`, and the native shell allowed to reach the published API host.
   - `.gitignore` entries for `dist/`, `ios/App/Pods`, and other generated native artifacts so the repo stays clean.

## Verification

- Run `npm run build:web` and confirm the SSR output is unchanged and the preview still works.
- Run `npm run build:mobile` and confirm `dist/index.html` plus hashed JS/CSS assets exist, and that the SPA boots (splash, bottom nav, Shop, Track, Community, Profile) against the published API.
- Run `npx cap sync` here to confirm the config and `webDir` resolve.
- `npx cap sync ios` itself needs macOS + CocoaPods, so that final step runs on your Mac; I'll give you the exact commands (`npm install`, `npx cap add ios` if the folder isn't committed, `npm run build:mobile`, `npx cap sync ios`, `npx cap open ios`).

## Notes

- Routes that already opt out of SSR (`/orders`, `/checkout/return`) are unaffected; the product-detail loader runs client-side in the mobile build.
- SEO/head tags stay on the web build; the mobile shell just uses them as the document head.
- No UI, styling, or feature changes.
