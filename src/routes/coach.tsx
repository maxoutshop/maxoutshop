import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Loader2, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/auth";
import { useElite, useMembershipSync } from "@/lib/subscription";
import { sendCoachMessage, type CoachMessage } from "@/lib/coach-client";

const TITLE = "MAXOUT Coach — AI training & nutrition";
const DESC =
  "Chat with MAXOUT Coach: programming, form cues and nutrition tuned to your own training history. Included with MAXOUT ELITE.";

export const Route = createFileRoute("/coach")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPage,
});

const STARTERS = [
  "Build me a 4-day split for the next 4 weeks",
  "How is my protein intake trending?",
  "What should I fix in my bench progression?",
];

function CoachPage() {
  const { user, loading } = useSession();
  const { isElite, loading: eliteLoading } = useElite(user?.id);
  useMembershipSync(user?.id);

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    const next = [...messages, { role: "user" as const, content: body }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply = await sendCoachMessage(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coach is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/track" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">MAXOUT Coach</h1>
            <p className="text-xs text-muted-foreground">Knows your workouts, PRs and nutrition.</p>
          </div>
        </div>

        {(loading || (user && eliteLoading)) && (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-3xl bg-surface" />
            ))}
          </div>
        )}

        {!loading && !user && (
          <div className="mt-8 rounded-3xl border border-border bg-surface p-6 text-center">
            <p className="text-sm font-semibold">Sign in to train with Coach</p>
            <Link
              to="/auth"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        )}

        {!loading && user && !eliteLoading && !isElite && <CoachLocked />}

        {!loading && user && isElite && (
          <>
            <div className="mt-6 space-y-3">
              {messages.length === 0 && (
                <div className="rounded-3xl border border-border bg-surface p-5">
                  <p className="text-sm">
                    Ask me anything about your training, nutrition or recovery — I read your MAXOUT history before
                    answering.
                  </p>
                  <div className="mt-4 space-y-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void send(s)}
                        className="w-full rounded-2xl border border-border px-4 py-3 text-left text-xs transition hover:bg-secondary/60"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[86%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-foreground text-background"
                      : "border border-border bg-surface"
                  }`}
                >
                  {m.content}
                </div>
              ))}

              {busy && (
                <div className="inline-flex items-center gap-2 rounded-3xl border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Coach is thinking…
                </div>
              )}
              {error && (
                <p className="rounded-2xl border border-destructive/40 p-4 text-xs text-destructive">{error}</p>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="sticky bottom-24 mt-5 flex gap-2 rounded-full border border-border bg-background/95 p-1.5 backdrop-blur"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask MAXOUT Coach…"
                className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}

function CoachLocked() {
  return (
    <div className="mt-6 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5">
        <div className="space-y-3 blur-[3px]">
          <div className="ml-auto w-[70%] rounded-3xl bg-foreground/90 px-4 py-3 text-sm text-background">
            Build me a 4-day split for the next 4 weeks
          </div>
          <div className="w-[85%] rounded-3xl border border-border bg-background px-4 py-3 text-sm">
            Based on your last 30 days you've hit chest twice a week and skipped posterior chain. Here's a 4-day upper /
            lower split that fixes it…
          </div>
        </div>
        <div className="absolute inset-0 grid place-items-center bg-background/40">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[11px] font-semibold uppercase tracking-widest">
            <Crown className="h-3.5 w-3.5" /> ELITE
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-accent/40 bg-accent/5 p-5">
        <p className="text-sm font-semibold">MAXOUT Coach is included with ELITE</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Unlimited AI coaching that reads your workouts, PRs and nutrition — plus photo food logging, weekly reports
          and 1.5x points.
        </p>
        <Link
          to="/elite"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          JOIN MAXOUT ELITE
        </Link>
      </div>
    </div>
  );
}
