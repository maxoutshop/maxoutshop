import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { initials, useSession } from "@/lib/auth";
import { useAthleteSearch, useConversations, useFollowing, useToggleFollow } from "@/lib/social";
import { Search, MessageCircle, UserPlus, UserCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — MAXOUT" },
      { name: "description", content: "Find training partners, follow athletes and send private messages inside MAXOUT." },
      { property: "og:title", content: "Messages — MAXOUT" },
      { property: "og:description", content: "Find friends, follow athletes and message them privately." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Messages,
});

function Messages() {
  const { user } = useSession();
  const uid = user?.id;
  const [tab, setTab] = useState<"inbox" | "find">("inbox");
  const [q, setQ] = useState("");
  const convos = useConversations(uid);
  const results = useAthleteSearch(q, uid);
  const following = useFollowing(uid);
  const toggle = useToggleFollow(uid);
  const followingSet = new Set(following.data ?? []);

  if (!user) {
    return (
      <AppShell>
        <div className="mt-10 rounded-3xl border border-border bg-surface p-8 text-center">
          <MessageCircle className="mx-auto h-6 w-6 text-accent" />
          <h1 className="mt-3 text-lg font-semibold">Messages are for members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to follow athletes and message them.</p>
          <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
            Join MAXOUT
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-5 sticky top-0 z-30 border-b border-border bg-background/85 px-5 pb-3 pt-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/community" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
        <div className="mt-3 inline-flex w-full rounded-full border border-border p-1">
          {(["inbox", "find"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold capitalize transition ${
                tab === t ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {t === "find" ? "Find friends" : "Inbox"}
            </button>
          ))}
        </div>
      </div>

      {tab === "inbox" ? (
        <div className="mt-4 space-y-2">
          {(convos.data ?? []).length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center">
              <MessageCircle className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No conversations yet.</p>
              <button onClick={() => setTab("find")} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
                Find friends
              </button>
            </div>
          )}
          {(convos.data ?? []).map((c) => {
            const name = c.other.display_name ?? c.other.username ?? "Athlete";
            return (
              <Link
                key={c.other.id}
                to="/messages/$handle"
                params={{ handle: c.other.username ?? c.other.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <Avatar url={c.other.avatar_url} name={name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    <span className="truncate">{name}</span>
                    {c.other.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  </p>
                  <p className={`truncate text-xs ${c.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {c.fromMe ? "You: " : ""}
                    {c.lastBody}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                    {c.unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or @handle"
              className="h-11 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="mt-3 space-y-2">
            {(results.data ?? []).length === 0 && !results.isLoading && (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No athletes found.
              </p>
            )}
            {(results.data ?? []).map((a) => {
              const name = a.display_name ?? a.username ?? "Athlete";
              const isFollowing = followingSet.has(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <Link to="/u/$handle" params={{ handle: a.username ?? "" }} disabled={!a.username} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar url={a.avatar_url} name={name} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold">
                        <span className="truncate">{name}</span>
                        {a.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      </p>
                      {a.username && <p className="truncate text-[11px] text-muted-foreground">@{a.username}</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => toggle.mutate({ targetId: a.id, follow: !isFollowing })}
                    className={`grid h-9 w-9 place-items-center rounded-full ${isFollowing ? "border border-border text-muted-foreground" : "bg-foreground text-background"}`}
                    aria-label={isFollowing ? "Unfollow" : "Follow"}
                  >
                    {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  </button>
                  <Link
                    to="/messages/$handle"
                    params={{ handle: a.username ?? a.id }}
                    aria-label="Message"
                    className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-background text-xs font-semibold">
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </div>
  );
}
