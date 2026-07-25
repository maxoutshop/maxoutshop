import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Heart, MessageCircle, Share2, Trophy, Flame } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [{ title: "Community — MAXOUT" }, { name: "description", content: "Join the MAXOUT community — challenges, PRs, and progress." }] }),
  component: Community,
});

const POSTS = [
  { user: "Jordan M.", handle: "jordan_lifts", time: "2h", body: "New bench PR — 245 for a clean single. Long road but the reps compound.", tag: "PR", stat: "245 lb Bench", likes: 128, comments: 14 },
  { user: "Alex R.", handle: "alexrunsfar", time: "5h", body: "Day 12 of the 30-Day Consistency challenge. Legs today, then meal-prep.", tag: "Challenge", likes: 84, comments: 6 },
  { user: "Sam K.", handle: "samk", time: "9h", body: "Wearing the America Hoodie for morning cardio — best hoodie MAXOUT has dropped.", tag: "Fit Check", likes: 210, comments: 22 },
];

const CHALLENGES = [
  { name: "30-Day Consistency", desc: "Log 20 workouts in November.", pct: 65, members: 482, reward: "15% off + Badge" },
  { name: "100K Steps", desc: "Hit 100,000 total steps this month.", pct: 42, members: 264, reward: "Rewards points" },
  { name: "Protein 7-Day", desc: "Hit your protein goal 7 days in a row.", pct: 71, members: 731, reward: "Early access" },
];

function Community() {
  const [tab, setTab] = useState<"feed" | "challenges">("feed");

  return (
    <AppShell>
      <div className="pt-2">
        <h1 className="text-2xl font-semibold">Community</h1>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {(["feed","challenges"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "feed" ? (
        <div className="mt-5 space-y-4">
          {POSTS.map((p) => <PostCard key={p.handle+p.time} post={p} />)}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {CHALLENGES.map((c) => (
            <div key={c.name} className="rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">Live</p>
                  <h3 className="mt-1 text-lg font-semibold">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                </div>
                <Trophy className="h-5 w-5 text-accent" />
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${c.pct}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.members} members · Reward: {c.reward}</span>
                <button className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">Join</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">Community moderation and posting activate after sign-in.</p>
    </AppShell>
  );
}

function PostCard({ post }: { post: typeof POSTS[number] }) {
  const [liked, setLiked] = useState(false);
  return (
    <article className="rounded-3xl border border-border bg-surface p-5">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">{post.user.charAt(0)}</div>
        <div>
          <p className="text-sm font-semibold">{post.user}</p>
          <p className="text-xs text-muted-foreground">@{post.handle} · {post.time}</p>
        </div>
        <span className="ml-auto rounded-full bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{post.tag}</span>
      </header>
      <p className="mt-3 text-sm leading-relaxed">{post.body}</p>
      {post.stat && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background/60 p-3">
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">{post.stat}</span>
        </div>
      )}
      <footer className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button onClick={() => setLiked((l) => !l)} className={`inline-flex items-center gap-1.5 ${liked ? "text-accent" : ""}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-accent" : ""}`} /> {post.likes + (liked ? 1 : 0)}
        </button>
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {post.comments}</span>
        <button className="ml-auto"><Share2 className="h-4 w-4" /></button>
      </footer>
    </article>
  );
}
