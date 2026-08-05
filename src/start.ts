import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Origins used by the Capacitor webview (iOS + Android). These are the only
// cross-origin callers allowed to reach server functions / API routes.
const NATIVE_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

function isNativeOrigin(origin: string | undefined | null): origin is string {
  return !!origin && NATIVE_ORIGINS.has(origin);
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Lets the native shell (static Capacitor build) call this deployment's server
// functions and API routes. Web requests are same-origin and unaffected.
const nativeCorsMiddleware = createMiddleware().server(async ({ next, request }) => {
  const origin = getRequestHeader("origin");
  if (!isNativeOrigin(origin)) {
    return next();
  }

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (request?.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  for (const [key, value] of Object.entries(corsHeaders)) {
    setResponseHeader(key, value);
  }
  return next();
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. The native shell is exempt (it has no cookies and
// authenticates with an explicit Supabase bearer token).
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn" && !isNativeOrigin(getRequestHeader("origin")),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, nativeCorsMiddleware, csrfMiddleware],
}));

