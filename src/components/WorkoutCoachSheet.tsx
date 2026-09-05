import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Loader2, Send, Sparkles, X } from "lucide-react";
import { sendCoachMessage, type CoachMessage } from "@/lib/coach-client";
import type { LiveSet } from "./WorkoutSession";

/** Quick asks tuned for the middle of a set. */
const QUICK = [
  { label: "Next set?", ask: "What weight and reps should I hit on my next set?" },
  { label: "Form cues", ask: "Give me 3 quick form cues for this exercise." },
  { label: "Swap it", ask: "This exercise isn't working today — what should I swap it for?" },
  { label: "Push or stop?", ask: "Should I push for another set or call it here?" },
];

function snapshot(o: {
  title: string;
  category: string;
  elapsed: string;
  exercise: string | null;
  sets: LiveSet[];
}) {
  const lines = o.sets.map((s) => `${s.exercise}: ${s.weight ?? 0} lb x ${s.reps ?? 0}`);
  return [
    `[Live workout context — answer in 3 sentences or less, gym-floor tone]`,
    `Workout: ${o.title} (${o.category}), running ${o.elapsed}.`,
    o.exercise ? `Currently on: ${o.exercise}.` : "",
    lines.length ? `Sets logged so far:\n${lines.join("\n")}` : "No sets logged yet this session.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function WorkoutCoachSheet({
  open,
  onClose,
  isElite,
  title,
  category,
  elapsed,
  exercise,
  sets,
}: {
  open: boolean;
  onClose: () => void;
  isElite: boolean;
  title: string;
  category: string;
  elapsed: string;
  exercise: string | null;
  sets: LiveSet[];
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, open]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    const shown = [...messages, { role: "user" as const, content: body }];
    setMessages(shown);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      // The live session state rides along with the first turn only.
      const context = snapshot({ title, category, elapsed, exercise, sets });
      const wire: CoachMessage[] = shown.map((m, i) =>
        i === 0 && m.role === "user" ? { ...m, content: `${context}\n\nAthlete: ${m.content}` } : m,
      );
      const reply = await sendCoachMessage(wire);
      setMessages([...shown, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coach is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-background/70 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close coach" onClick={onClose} />
      <div className="relative flex max-h-[85vh] flex-col rounded-t-3xl border-t border-border bg-surface pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-2xl border border-border bg-background">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">MAXOUT Coach</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {exercise ? `On ${exercise} · ${sets.length} sets in` : `${sets.length} sets in`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close coach" className="grid h-9 w-9 place-items-center rounded-full border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isElite ? (
          <div className="p-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest">
              <Crown className="h-3.5 w-3.5" /> ELITE
            </span>
            <p className="mt-4 text-sm font-semibold">Coaching mid-workout is an ELITE perk</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Real-time weight calls, form cues and swaps that read your training history.
            </p>
            <Link
              to="/elite"
              className="mt-4 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
            >
              JOIN MAXOUT ELITE
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                  I can see this session live — sets, weights and how long you've been training. Ask away.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[88%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm ${
                    m.role === "user" ? "ml-auto bg-foreground text-background" : "border border-border bg-background"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="inline-flex items-center gap-2 rounded-3xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Coach is thinking…
                </div>
              )}
              {error && <p className="rounded-2xl border border-destructive/40 p-4 text-xs text-destructive">{error}</p>}
              <div ref={endRef} />
            </div>

            <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  onClick={() => void send(q.ask)}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-border px-3.5 py-2 text-[11px] font-semibold text-muted-foreground active:scale-95 disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="mx-5 mb-1 flex gap-2 rounded-full border border-border bg-background p-1.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask mid-set…"
                className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
