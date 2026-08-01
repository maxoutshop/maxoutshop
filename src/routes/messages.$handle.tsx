import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { initials, useSession } from "@/lib/auth";
import { useSendMessage, useThread, type AthleteLite } from "@/lib/social";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/messages/$handle")({
  head: () => ({
    meta: [
      { title: "Chat — MAXOUT Messages" },
      { name: "description", content: "Private conversation with a MAXOUT athlete." },
      { property: "og:title", content: "Chat — MAXOUT Messages" },
      { property: "og:description", content: "Private conversation with a MAXOUT athlete." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Thread,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Thread() {
  const { handle } = useParams({ from: "/messages/$handle" });
  const { user } = useSession();
  const uid = user?.id;
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const other = useQuery({
    queryKey: ["dm-partner", handle],
    enabled: !!uid,
    queryFn: async () => {
      const col = UUID.test(handle) ? "id" : "username";
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, verified, is_elite")
        .eq(col, handle)
        .maybeSingle();
      if (error) throw error;
      return data as AthleteLite | null;
    },
  });

  const otherId = other.data?.id;
  const thread = useThread(uid, otherId);
  const send = useSendMessage(uid, otherId);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.data?.length]);

  if (!user) {
    return (
      <AppShell>
        <div className="mt-10 rounded-3xl border border-border bg-surface p-8 text-center">
          <h1 className="text-lg font-semibold">Sign in to message athletes</h1>
          <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
            Join MAXOUT
          </Link>
        </div>
      </AppShell>
    );
  }

  const name = other.data?.display_name ?? other.data?.username ?? "Athlete";

  return (
    <AppShell>
      <div className="-mx-5 sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-xl">
        <Link to="/messages" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full border border-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-[11px] font-semibold">
          {other.data?.avatar_url ? (
            <img src={other.data.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          <span className="truncate">{name}</span>
          {other.data?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
        </p>
      </div>

      <div className="mt-4 space-y-2 pb-28">
        {(thread.data ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            Say what's up to {name.split(" ")[0]}.
          </p>
        )}
        {(thread.data ?? []).map((m) => {
          const mine = m.sender_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-accent text-accent-foreground" : "border border-border bg-surface"
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          send.mutate(draft, { onSuccess: () => setDraft("") });
        }}
        className="fixed inset-x-0 bottom-[72px] z-30 mx-auto flex max-w-2xl items-center gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
          placeholder="Message…"
          className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-foreground/30"
        />
        <button
          type="submit"
          disabled={!draft.trim() || send.isPending}
          className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </AppShell>
  );
}
