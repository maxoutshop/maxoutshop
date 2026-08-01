import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EliteBadge } from "@/components/EliteBadge";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Heart, MessageCircle, Share2, Flame, Dumbbell, Camera, TrendingUp, Trophy, BadgeCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/auth";
import { useComments, useMutate, usePosts, isVideoUrl } from "@/lib/db";

const PARTICLES: { x: number; y: number; d: number }[] = [
  { x: -70, y: -60, d: 0 },
  { x: 70, y: -55, d: 40 },
  { x: -95, y: 20, d: 80 },
  { x: 95, y: 25, d: 60 },
  { x: -35, y: -100, d: 100 },
  { x: 40, y: -105, d: 20 },
  { x: -55, y: 75, d: 120 },
  { x: 60, y: 70, d: 90 },
];

export type PostRow = NonNullable<ReturnType<typeof usePosts>["data"]>[number];

const TAG_STYLE: Record<string, { icon: typeof Flame; label: string; ring: string; chip: string }> = {
  PR: { icon: Trophy, label: "Personal record", ring: "from-accent to-destructive", chip: "bg-accent/15 text-accent" },
  Challenge: { icon: Flame, label: "Challenge", ring: "from-destructive to-accent", chip: "bg-destructive/15 text-destructive" },
  "Fit Check": { icon: Camera, label: "Fit check", ring: "from-foreground/70 to-muted-foreground", chip: "bg-foreground/10 text-foreground" },
  Progress: { icon: TrendingUp, label: "Progress", ring: "from-accent to-foreground/60", chip: "bg-accent/10 text-accent" },
  Workout: { icon: Dumbbell, label: "Workout", ring: "from-muted-foreground to-foreground/60", chip: "bg-secondary text-muted-foreground" },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FeedPost({ post, uid }: { post: PostRow; uid?: string }) {
  const likes = post.post_likes ?? [];
  const liked = !!uid && likes.some((l) => l.user_id === uid);
  const author = post.profiles;
  const commentCount = (post.post_comments ?? []).length;
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);

  const meta = (post.tag && TAG_STYLE[post.tag]) || TAG_STYLE.Workout!;
  const Icon = meta.icon;

  const toggle = useMutate(async (next: boolean) => {
    if (!uid) return;
    if (next) await supabase.from("post_likes").insert({ post_id: post.id, user_id: uid });
    else await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", uid);
  }, ["posts"]);

  const like = (next: boolean) => {
    if (!uid || toggle.isPending) return;
    if (next) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    }
    toggle.mutate(next);
  };

  const onBodyTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !liked) like(true);
    lastTap.current = now;
  };

  const name = author?.display_name ?? author?.username ?? "MAXOUT athlete";

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link
          to="/u/$handle"
          params={{ handle: author?.username ?? "" }}
          disabled={!author?.username}
          className="flex min-w-0 items-center gap-3"
        >
          <div className={`rounded-full bg-gradient-to-br ${meta.ring} p-[2px]`}>
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface text-xs font-semibold ring-2 ring-surface">
              <MediaImage
                src={author?.avatar_url}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
                fallback={initials(name)}
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-sm font-semibold">
              <span className="truncate">{name}</span>
              {author?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
              {(author as { is_elite?: boolean } | undefined)?.is_elite && <EliteBadge className="h-3 w-3" />}
              {author?.is_ambassador && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {author?.username ? `@${author.username} · ` : ""}
              {timeAgo(post.created_at)}
            </p>
          </div>
        </Link>
        <span className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}>
          <Icon className="h-3 w-3" /> {post.tag ?? "Log"}
        </span>
      </header>


      <div className="relative select-none px-4 pt-3" onClick={onBodyTap}>
        <p className="text-[15px] leading-relaxed">{post.body}</p>
        {post.image_url && (
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-border">
            {isVideoUrl(post.image_url) ? (
              <video
                src={post.image_url}
                className="aspect-4/5 w-full bg-black object-cover"
                playsInline
                muted
                loop
                controls
                preload="metadata"
              />
            ) : (
              <img src={post.image_url} alt={`${name} post`} className="aspect-4/5 w-full object-cover" loading="lazy" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        )}
        {post.tag === "PR" && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/20">
              <Flame className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">New PR</p>
              <p className="text-xs text-muted-foreground">Maxed out and logged it.</p>
            </div>
          </div>
        )}
        {burst && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
            <span className="absolute h-24 w-24 rounded-full border-2 border-accent/70 like-ring" />
            <Heart className="h-24 w-24 fill-accent text-accent drop-shadow-[0_0_24px_hsl(var(--accent)/0.6)] like-pop" />
            {PARTICLES.map((p, i) => (
              <Heart
                key={i}
                className="absolute h-4 w-4 fill-accent text-accent like-particle"
                style={{ "--px": `${p.x}px`, "--py": `${p.y}px`, animationDelay: `${p.d}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center gap-1 border-t border-border px-2 py-2 text-xs text-muted-foreground">
        <button
          onClick={() => like(!liked)}
          disabled={!uid}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-semibold transition-transform active:scale-90 ${liked ? "text-accent" : ""}`}
        >
          <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-accent like-beat" : ""}`} /> {likes.length}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-semibold ${open ? "text-foreground" : ""}`}
        >
          <MessageCircle className="h-4 w-4" /> {commentCount}
        </button>
        <button
          onClick={() => {
            const text = `${name} on MAXOUT: ${post.body}`;
            if (navigator.share) void navigator.share({ text }).catch(() => {});
            else void navigator.clipboard?.writeText(text);
          }}
          className="ml-auto rounded-full px-3 py-2"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </footer>

      {open && <Comments postId={post.id} uid={uid} />}
    </article>
  );
}

function Comments({ postId, uid }: { postId: string; uid?: string }) {
  const [text, setText] = useState("");
  const comments = useComments(postId);
  const add = useMutate(async (body: string) => {
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: uid!, body });
    if (error) throw error;
  }, ["comments", "posts"]);

  return (
    <div className="animate-in border-t border-border bg-background/40 px-4 py-3 fade-in slide-in-from-top-1">
      <div className="space-y-3">
        {(comments.data ?? []).map((c) => {
          const n = c.profiles?.display_name ?? c.profiles?.username ?? "Athlete";
          return (
            <div key={c.id} className="flex gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">{initials(n)}</div>
              <div className="rounded-2xl rounded-tl-sm bg-surface-elevated px-3 py-2">
                <p className="text-[11px] font-semibold">{n}</p>
                <p className="text-sm leading-snug">{c.body}</p>
              </div>
            </div>
          );
        })}
        {!comments.isLoading && (comments.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">No comments yet — hype them up.</p>
        )}
      </div>
      {uid && (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            add.mutate(text.trim(), { onSuccess: () => setText("") });
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="submit"
            disabled={!text.trim() || add.isPending}
            className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
