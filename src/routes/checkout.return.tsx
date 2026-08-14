import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Crown, Loader2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshMembership } from "@/lib/elite-client";
import { IS_NATIVE_BUILD } from "@/lib/api-base";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { session_id?: string; canceled?: boolean; native?: boolean } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
    canceled: search["canceled"] === "1" || search["canceled"] === 1 || search["canceled"] === true,
    native: search["native"] === "1" || search["native"] === 1 || search["native"] === true,
  }),
  head: () => ({
    meta: [
      { title: "Membership confirmed — MAXOUT ELITE" },
      { name: "description", content: "Your MAXOUT ELITE membership is being confirmed." },
      { property: "og:title", content: "Membership confirmed — MAXOUT ELITE" },
      { property: "og:description", content: "Your MAXOUT ELITE membership is being confirmed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canceled, native } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "pending" | "error" | "canceled">(
    canceled ? "canceled" : "working",
  );
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (canceled) return;
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      // Poll — the Stripe webhook and our direct sync race each other.
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        try {
          const res = await refreshMembership();
          if (res.isElite) {
            await qc.invalidateQueries();
            setState("done");
            return;
          }
        } catch (e) {
          setMessage(e instanceof Error ? e.message : null);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setState("pending");
    })();

    return () => {
      cancelled = true;
    };
  }, [qc, canceled]);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-7 text-center">
        {state === "working" && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            <h1 className="mt-4 text-lg font-semibold">Confirming your membership</h1>
            <p className="mt-1 text-xs text-muted-foreground">One moment — activating MAXOUT ELITE.</p>
          </>
        )}

        {state === "canceled" && (
          <>
            <h1 className="text-lg font-semibold">Checkout cancelled</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing was charged and your membership hasn't changed.
            </p>
            <Link
              to="/elite"
              className="mt-5 flex w-full items-center justify-center rounded-full border border-border py-3.5 text-sm font-semibold"
            >
              Back to membership
            </Link>
          </>
        )}

        {state === "done" && (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <Crown className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">You're ELITE</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Photo food logging and early drops are unlocked.
            </p>
            {native && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                You can close this window and return to the MAXOUT app.
              </p>
            )}
            <button
              onClick={() => navigate({ to: "/track" })}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Start logging
            </button>
          </>
        )}

        {(state === "pending" || state === "error") && (
          <>
            <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground" />
            <h1 className="mt-4 text-lg font-semibold">
              {state === "error" ? "We hit a snag" : "Still processing"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {message ??
                "Your payment went through but activation is taking a moment. Reopen the membership page in a minute and it'll be live."}
            </p>
            <Link
              to="/elite"
              className="mt-5 flex w-full items-center justify-center rounded-full border border-border py-3.5 text-sm font-semibold"
            >
              Back to membership
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
