import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { FeedPost } from "@/components/FeedPost";
import { Trophy, X, Plus, Flame, Camera, TrendingUp, Dumbbell, Users, ImagePlus, Video, Sparkles, Search, MessageCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { usePosts, useChallenges, useMyChallenges, useMutate, uploadPostMedia, MAX_POST_MEDIA_MB } from "@/lib/db";
import { useUnreadCount } from "@/lib/social";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — MAXOUT Challenges & Feed" },
      { name: "description", content: "Share PRs, fit checks and progress. Join MAXOUT challenges with the community." },
      { property: "og:title", content: "Community — MAXOUT Challenges & Feed" },
      { property: "og:description", content: "Share PRs, join challenges and train with the MAXOUT community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Community,
});

const TAGS = [
  { key: "PR", icon: Trophy },
  { key: "Fit Check", icon: Camera },
  { key: "Progress", icon: TrendingUp },
  { key: "Workout", icon: Dumbbell },
  { key: "Challenge", icon: Flame },
] as const;

const FILTERS = ["All", "PR", "Fit Check", "Progress", "Workout", "Challenge"] as const;

function Community() {
  const { user, loading: sessionLoading } = useSession();
  const uid = user?.id;
  const [tab, setTab] = useState<"feed" | "challenges">("feed");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [composing, setComposing] = useState(false);
  const posts = usePosts(uid);
  const challenges = useChallenges();
  const mine = useMyChallenges(uid);
  const unread = useUnreadCount(uid);

  const join = useMutate(async (challengeId: string) => {
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: uid! });
    if (error) throw error;
  }, ["my-challenges", "profile"]);

  const joinedIds = new Set((mine.data ?? []).map((m) => m.challenge_id));

  const feed = useMemo(() => {
    const all = posts.data ?? [];
    return filter === "All" ? all : all.filter((p) => p.tag === filter);
  }, [posts.data, filter]);

  const todayCount = (posts.data ?? []).filter(
    (p) => new Date(p.created_at).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <AppShell>
      <div className="-mx-5 sticky top-0 z-30 border-b border-border bg-background/85 px-5 pb-3 pt-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">The Floor</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {todayCount} {todayCount === 1 ? "log" : "logs"} today
            </p>
          </div>
          <div className="inline-flex rounded-full border border-border p-1">
            {(["feed", "challenges"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "feed" && (
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f ? "border-transparent bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {!user && !sessionLoading && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface p-6 text-center">
          <Users className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-3 text-sm text-muted-foreground">Sign in to post PRs, drop comments and join challenges.</p>
          <Link to="/auth" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
            Join MAXOUT
          </Link>
        </div>
      )}

      {tab === "feed" ? (
        <>
          {user && (
            <div className="mt-4 flex items-center gap-2">
              <Link
                to="/messages"
                className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
              >
                <Search className="h-4 w-4" /> Search for friends
              </Link>
              <Link
                to="/messages"
                aria-label="Messages"
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface"
              >
                <MessageCircle className="h-4 w-4" />
                {(unread.data ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                    {unread.data}
                  </span>
                )}
              </Link>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {feed.map((p) => (
              <FeedPost key={p.id} post={p} uid={uid} />
            ))}

            {user && feed.length === 0 && (
              <div className="rounded-3xl border border-border bg-gradient-to-b from-surface to-background p-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-accent" />
                <h3 className="mt-3 text-lg font-semibold">
                  {filter === "All" ? "The floor is empty" : `No ${filter} posts yet`}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Set the tone — post your first lift, fit check or PR.</p>
                <button
                  onClick={() => setComposing(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  <Plus className="h-4 w-4" /> Create post
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-3">
          {(challenges.data ?? []).map((c) => {
            const joined = joinedIds.has(c.id);
            return (
              <div key={c.id} className="overflow-hidden rounded-3xl border border-border bg-surface">
                {c.image_url && <img src={c.image_url} alt={c.title} className="h-32 w-full object-cover" loading="lazy" />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
                        <Flame className="h-3 w-3" /> Live
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                    </div>
                    <Trophy className="h-5 w-5 shrink-0 text-accent" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{c.goal_label}</span>
                    {user ? (
                      <button
                        disabled={joined}
                        onClick={() => join.mutate(c.id)}
                        className={`rounded-full px-4 py-1.5 font-semibold ${joined ? "border border-border text-muted-foreground" : "bg-primary text-primary-foreground"}`}
                      >
                        {joined ? "Joined" : "Join"}
                      </button>
                    ) : (
                      <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">
                        Join
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && tab === "feed" && (
        <button
          onClick={() => setComposing(true)}
          aria-label="Create post"
          className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/25 transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {composing && uid && <Composer uid={uid} onClose={() => setComposing(false)} />}
    </AppShell>
  );
}

function Composer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>(TAGS[0].key);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const isVideo = !!file?.type.startsWith("video");

  const pick = (f?: File) => {
    if (!f) return;
    setErr("");
    if (f.size > MAX_POST_MEDIA_MB * 1024 * 1024) {
      setErr(`Keep it under ${MAX_POST_MEDIA_MB}MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
  };

  const create = useMutate(async () => {
    let mediaUrl: string | null = null;
    if (file) {
      setUploading(true);
      try {
        mediaUrl = await uploadPostMedia(uid, file);
      } finally {
        setUploading(false);
      }
    }
    const { error } = await supabase.from("posts").insert({
      user_id: uid,
      body,
      tag,
      image_url: mediaUrl,
    });
    if (error) throw error;
  }, ["posts", "profile"]);

  const busy = uploading || create.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-in max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-10 slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Post to the floor</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {TAGS.map((t) => {
            const Icon = t.icon;
            const active = tag === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTag(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
                  active ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.key}
              </button>
            );
          })}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 280))}
          rows={4}
          placeholder="What did you max out today?"
          className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />

        {preview ? (
          <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
            {isVideo ? (
              <video src={preview} className="max-h-72 w-full bg-black object-cover" controls playsInline muted />
            ) : (
              <img src={preview} alt="Selected media" className="max-h-72 w-full object-cover" />
            )}
            <button
              onClick={clear}
              aria-label="Remove media"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
            {uploading && (
              <div className="absolute inset-0 grid place-items-center bg-background/70 text-xs font-semibold">
                Uploading…
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => photoRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs font-semibold"
            >
              <ImagePlus className="h-4 w-4" /> Photo
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs font-semibold"
            >
              <Video className="h-4 w-4" /> Video
            </button>
          </div>
        )}

        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-destructive">{err || (create.isError ? "Couldn't post — try again." : "")}</span>
          <span className="text-[11px] text-muted-foreground">{body.length}/280</span>
        </div>

        <button
          disabled={(!body.trim() && !file) || busy}
          onClick={() => create.mutate(undefined as never, { onSuccess: onClose })}
          className="mt-3 w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          {uploading ? "Uploading…" : create.isPending ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
