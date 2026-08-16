import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera, Check, Copy, Dumbbell, Eye, EyeOff, Heart, Image as ImageIcon,
  Loader2, MessageCircle, Share2, Timer, Trophy, X,
} from "lucide-react";
import { MediaImage } from "@/components/Media";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EliteBadge } from "@/components/EliteBadge";
import { initials } from "@/lib/auth";
import { fmtNum, totalVolume, type SetRow } from "@/lib/workout-math";
import {
  uploadCover, useAddWorkoutComment, useFollowList, useToggleWorkoutLike,
  useToggleWorkoutVisibility, useWorkoutComments, useWorkoutLikes, type PublicWorkout,
} from "@/lib/profile";

/* ---------------- Cover photo ---------------- */

export function ProfileCover({
  url,
  editable,
  userId,
}: {
  url?: string | null;
  editable?: boolean;
  userId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function onPick(file?: File) {
    if (!file || !userId) return;
    setBusy(true);
    try {
      await uploadCover(userId, file);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["profile-by-username"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="-mx-5 relative h-36 overflow-hidden bg-gradient-to-br from-secondary via-surface to-background sm:h-44">
      {url ? (
        <MediaImage src={url} alt="" className="h-full w-full object-cover" fallback="" />
      ) : (
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(120%_80%_at_20%_0%,hsl(var(--accent)/0.35),transparent_60%)]" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
      {editable && (
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70 backdrop-blur"
          aria-label="Change cover photo"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
    </div>
  );
}

/* ---------------- Identity block ---------------- */

export function ProfileIdentity({
  name,
  handle,
  avatarUrl,
  verified,
  elite,
  onAvatarPick,
  bio,
  meta,
}: {
  name: string;
  handle?: string | null;
  avatarUrl?: string | null;
  verified?: boolean | null;
  elite?: boolean | null;
  onAvatarPick?: (file: File) => Promise<void>;
  bio?: string | null;
  meta?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="-mt-12 relative">
      <div className="flex items-end gap-4">
        <div className="relative shrink-0">
          <div className={`rounded-full p-[2px] ${elite ? "bg-gradient-to-br from-accent to-destructive" : "bg-border"}`}>
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-surface text-2xl font-semibold ring-4 ring-background">
              <MediaImage src={avatarUrl} alt={name} className="h-full w-full object-cover" fallback={initials(name)} />
            </div>
          </div>
          {onAvatarPick && (
            <>
              <button
                onClick={() => inputRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground ring-2 ring-background"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try { await onAvatarPick(f); } finally { setBusy(false); }
                }}
              />
            </>
          )}
        </div>
      </div>

      <h1 className="mt-4 flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
        <span className="truncate">{name}</span>
        {verified && <VerifiedBadge className="h-4 w-4" />}
        {elite && <EliteBadge className="h-3.5 w-3.5" />}
      </h1>
      {handle && <p className="text-xs text-muted-foreground">@{handle}</p>}
      {bio && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{bio}</p>}
      {!!meta?.length && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{meta.join(" · ")}</p>
      )}
    </div>
  );
}

/* ---------------- Stats row with follower sheets ---------------- */

export function ProfileStats({
  userId,
  followers,
  following,
  streak,
}: {
  userId?: string;
  followers: number;
  following: number;
  streak: number;
}) {
  const [sheet, setSheet] = useState<"followers" | "following" | null>(null);
  return (
    <>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <button onClick={() => setSheet("followers")} className="rounded-2xl border border-border bg-surface p-4 text-center active:scale-[0.98] transition">
          <p className="text-xl font-semibold tabular-nums">{followers}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Followers</p>
        </button>
        <button onClick={() => setSheet("following")} className="rounded-2xl border border-border bg-surface p-4 text-center active:scale-[0.98] transition">
          <p className="text-xl font-semibold tabular-nums">{following}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Following</p>
        </button>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-xl font-semibold tabular-nums">{streak}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Day streak</p>
        </div>
      </div>
      {sheet && <FollowListSheet userId={userId} mode={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}

function FollowListSheet({ userId, mode, onClose }: { userId?: string; mode: "followers" | "following"; onClose: () => void }) {
  const list = useFollowList(userId, mode);
  return (
    <Sheet title={mode === "followers" ? "Followers" : "Following"} onClose={onClose}>
      {list.isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>}
      {!list.isLoading && (list.data ?? []).length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">Nobody here yet.</p>
      )}
      <div className="max-h-[55vh] space-y-1 overflow-y-auto">
        {(list.data ?? []).map((p) => {
          const nm = p.display_name ?? p.username ?? "Athlete";
          return (
            <Link
              key={p.id}
              to="/u/$handle"
              params={{ handle: p.username ?? p.id }}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-secondary/50"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-xs font-semibold">
                <MediaImage src={p.avatar_url} alt={nm} className="h-full w-full object-cover" fallback={initials(nm)} />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-medium">
                  {nm} {p.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                </p>
                {p.username && <p className="truncate text-[11px] text-muted-foreground">@{p.username}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------------- Tabs ---------------- */

export function ProfileTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="-mx-5 mt-6 flex gap-1 overflow-x-auto border-b border-border px-5 pb-px [scrollbar-width:none]">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`shrink-0 border-b-2 px-4 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
            active === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Share profile ---------------- */

export function ShareProfileButton({ handle, name }: { handle?: string | null; name: string }) {
  const [copied, setCopied] = useState(false);
  if (!handle) return null;

  async function share() {
    const url = `${window.location.origin}/u/${handle}`;
    const data = { title: `${name} on MAXOUT`, text: `Check out ${name} on MAXOUT`, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch { /* user cancelled — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Share profile"}
    </button>
  );
}

export function CopyHandle({ handle }: { handle: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(`@${handle}`);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Copied" : "Copy handle"}
    </button>
  );
}

/* ---------------- Public workout card + full view ---------------- */

export function WorkoutCard({
  workout,
  uid,
  isMe,
  onOpen,
}: {
  workout: PublicWorkout;
  uid?: string;
  isMe: boolean;
  onOpen: () => void;
}) {
  const sets = (workout.workout_sets ?? []) as unknown as SetRow[];
  const volume = totalVolume(sets);
  const exercises = Array.from(new Set(sets.map((s) => s.exercise)));
  const likes = useWorkoutLikes(workout.is_public ? workout.id : undefined);
  const toggleVis = useToggleWorkoutVisibility();
  const liked = !!uid && (likes.data ?? []).includes(uid);

  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {new Date(workout.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {workout.category}
          </p>
          <p className="mt-1 truncate text-base font-semibold tracking-tight">{workout.title ?? workout.category}</p>
        </button>
        {isMe && (
          <button
            onClick={() => toggleVis.mutate({ workoutId: workout.id, isPublic: !workout.is_public })}
            disabled={toggleVis.isPending}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
              workout.is_public ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted-foreground"
            }`}
          >
            {workout.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {workout.is_public ? "Public" : "Private"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Dumbbell className="h-3 w-3" /> {sets.length} sets</span>
        <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> {workout.duration_min ?? 0}m</span>
        <span>{fmtNum(volume)} lb volume</span>
      </div>

      {exercises.length > 0 && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{exercises.slice(0, 4).join(" · ")}</p>
      )}

      {workout.is_public && (
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className={`inline-flex items-center gap-1 ${liked ? "text-accent" : ""}`}>
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {(likes.data ?? []).length}
          </span>
          <button onClick={onOpen} className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> Comments
          </button>
        </div>
      )}
    </div>
  );
}

export function WorkoutSheet({
  workout,
  uid,
  athleteName,
  onClose,
}: {
  workout: PublicWorkout;
  uid?: string;
  athleteName: string;
  onClose: () => void;
}) {
  const sets = (workout.workout_sets ?? []) as unknown as SetRow[];
  const byExercise = sets.reduce<Record<string, SetRow[]>>((acc, s) => {
    (acc[s.exercise] ||= []).push(s);
    return acc;
  }, {});
  const likes = useWorkoutLikes(workout.is_public ? workout.id : undefined);
  const toggleLike = useToggleWorkoutLike(uid);
  const comments = useWorkoutComments(workout.is_public ? workout.id : undefined);
  const addComment = useAddWorkoutComment(uid);
  const [body, setBody] = useState("");
  const liked = !!uid && (likes.data ?? []).includes(uid);

  return (
    <Sheet title={workout.title ?? workout.category} onClose={onClose}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {athleteName} · {new Date(workout.performed_at).toLocaleDateString()} · {workout.duration_min ?? 0}m ·{" "}
        {fmtNum(totalVolume(sets))} lb
      </p>

      <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto">
        {Object.entries(byExercise).map(([exercise, rows]) => (
          <div key={exercise} className="rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm font-semibold">{exercise}</p>
            <div className="mt-2 space-y-1">
              {rows.map((s, i) => (
                <p key={s.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>Set {i + 1}</span>
                  <span className="tabular-nums text-foreground">
                    {s.weight ?? 0} lb × {s.reps ?? 0}
                  </span>
                </p>
              ))}
            </div>
          </div>
        ))}
        {workout.notes && <p className="rounded-2xl bg-background/50 p-4 text-xs text-muted-foreground">{workout.notes}</p>}
      </div>

      {workout.is_public && (
        <>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <button
              onClick={() => toggleLike.mutate({ workoutId: workout.id, liked: !liked })}
              disabled={!uid || toggleLike.isPending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                liked ? "border-accent/40 bg-accent/10 text-accent" : "border-border"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {(likes.data ?? []).length}
            </button>
            <span className="text-xs text-muted-foreground">{(comments.data ?? []).length} comments</span>
          </div>

          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {(comments.data ?? []).map((c) => {
              const p = (c as { profiles?: { display_name?: string | null; username?: string | null } }).profiles;
              return (
                <p key={c.id} className="text-xs">
                  <span className="font-semibold">{p?.display_name ?? p?.username ?? "Athlete"}</span>{" "}
                  <span className="text-muted-foreground">{c.body}</span>
                </p>
              );
            })}
          </div>

          {uid && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!body.trim()) return;
                addComment.mutate({ workoutId: workout.id, body }, { onSuccess: () => setBody("") });
              }}
            >
              <input
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 500))}
                placeholder="Say something…"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground/30"
              />
              <button
                disabled={addComment.isPending || !body.trim()}
                className="rounded-full bg-foreground px-4 text-xs font-semibold text-background disabled:opacity-40"
              >
                Post
              </button>
            </form>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------------- Featured PR grid ---------------- */

export type PRRow = { id: string; exercise: string; value: number; unit: string; kind: string; achieved_at: string; featured?: boolean | null };

export function FeaturedPRs({ prs, editable, onToggle }: { prs: PRRow[]; editable?: boolean; onToggle?: (pr: PRRow) => void }) {
  if (!prs.length) return null;
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {prs.map((p) => (
        <button
          key={p.id}
          onClick={() => onToggle?.(p)}
          disabled={!editable}
          className="rounded-2xl border border-foreground/20 bg-surface p-4 text-left"
        >
          <Trophy className="h-3.5 w-3.5 text-accent" />
          <p className="mt-2 truncate text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{p.exercise}</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight">
            {Number(p.value)}
            <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{p.unit}</span>
          </p>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Shared sheet shell ---------------- */

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-in w-full rounded-t-3xl border-t border-border bg-surface p-5 pb-10 slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
