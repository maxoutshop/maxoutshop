import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Heart, MessageCircle, Share2, Trophy, Flame, X, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, initials } from "@/lib/auth";
import { usePosts, useChallenges, useMyChallenges, useMutate } from "@/lib/db";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — MAXOUT Challenges & Feed" },
      { name: "description", content: "Share PRs, join MAXOUT challenges and earn rewards with the community." },
      { property: "og:title", content: "Community — MAXOUT Challenges & Feed" },
      { property: "og:description", content: "Share PRs, join challenges and earn MAXOUT rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Community,
});

const TAGS = ["PR", "Challenge", "Fit Check", "Progress"];

function Community() {
  const { user } = useSession();
  const uid = user?.id;
  const [tab, setTab] = useState<"feed" | "challenges">("feed");
  const [composing, setComposing] = useState(false);
  const posts = usePosts(uid);
  const challenges = useChallenges();
  const mine = useMyChallenges(uid);

  const join = useMutate(async (challengeId: string) => {
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: uid! });
    if (error) throw error;
    await supabase.from("points_ledger").insert({ user_id: uid!, delta: 10, reason: "Joined a challenge" });
  }, ["my-challenges", "profile", "points"]);

  const joinedIds = new Set((mine.data ?? []).map((m) => m.challenge_id));

  return (
    <AppShell>
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Community</h1>
          {user && tab === "feed" && (
            <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Plus className="h-3.5 w-3.5" /> Post
            </button>
          )}
        </div>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {(["feed", "challenges"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      {!user && (
        <div className="mt-5 rounded-3xl border border-border bg-surface p-5 text-center">
          <p className="text-sm text-muted-foreground">Sign in to post, like and join challenges.</p>
          <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">Join MAXOUT</Link>
        </div>
      )}

      {tab === "feed" ? (
        <div className="mt-5 space-y-4">
          {(posts.data ?? []).map((p) => <PostCard key={p.id} post={p} uid={uid} />)}
          {user && (posts.data ?? []).length === 0 && (
            <p className="rounded-3xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No posts yet — be the first to share a PR.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {(challenges.data ?? []).map((c) => {
            const joined = joinedIds.has(c.id);
            return (
              <div key={c.id} className="rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">Live</p>
                    <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  </div>
                  <Trophy className="h-5 w-5 text-accent" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.goal_label} · {c.reward_points} pts</span>
                  {user ? (
                    <button
                      disabled={joined}
                      onClick={() => join.mutate(c.id)}
                      className={`rounded-full px-4 py-1.5 font-semibold ${joined ? "border border-border text-muted-foreground" : "bg-primary text-primary-foreground"}`}
                    >
                      {joined ? "Joined" : "Join"}
                    </button>
                  ) : (
                    <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">Join</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {composing && uid && <Composer uid={uid} onClose={() => setComposing(false)} />}
    </AppShell>
  );
}

function Composer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState(TAGS[0]!);
  const create = useMutate(async () => {
    const { error } = await supabase.from("posts").insert({ user_id: uid, body, tag });
    if (error) throw error;
    await supabase.from("points_ledger").insert({ user_id: uid, delta: 10, reason: "Shared a post" });
  }, ["posts", "profile", "points"]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full rounded-t-3xl border-t border-border bg-surface p-5 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Share with the community</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="mt-4 flex gap-2">
          {TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tag === t ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What did you max out today?"
          className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
        />
        <button
          disabled={!body.trim() || create.isPending}
          onClick={() => create.mutate(undefined as never, { onSuccess: onClose })}
          className="mt-3 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}

type PostRow = NonNullable<ReturnType<typeof usePosts>["data"]>[number];

function PostCard({ post, uid }: { post: PostRow; uid?: string }) {
  const likes = post.post_likes ?? [];
  const liked = !!uid && likes.some((l) => l.user_id === uid);
  const author = post.profiles;

  const toggle = useMutate(async () => {
    if (!uid) return;
    if (liked) await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", uid);
    else await supabase.from("post_likes").insert({ post_id: post.id, user_id: uid });
  }, ["posts"]);

  const name = author?.display_name ?? author?.username ?? "MAXOUT athlete";
  const when = new Date(post.created_at);

  return (
    <article className="rounded-3xl border border-border bg-surface p-5">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">{initials(name)}</div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            {author?.username ? `@${author.username} · ` : ""}{when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        {post.tag && (
          <span className="ml-auto rounded-full bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{post.tag}</span>
        )}
      </header>
      <p className="mt-3 text-sm leading-relaxed">{post.body}</p>
      {post.tag === "PR" && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background/60 p-3">
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">Personal record</span>
        </div>
      )}
      <footer className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button onClick={() => toggle.mutate(undefined as never)} disabled={!uid} className={`inline-flex items-center gap-1.5 ${liked ? "text-accent" : ""}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-accent" : ""}`} /> {likes.length}
        </button>
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> 0</span>
        <button className="ml-auto"><Share2 className="h-4 w-4" /></button>
      </footer>
    </article>
  );
}
