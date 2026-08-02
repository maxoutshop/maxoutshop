import { MediaImage } from "@/components/Media";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Shield, Search, Trash2, Crown, BadgeCheck, Plus, Flag,
  Users, Loader2, X, Eraser, Bell,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdminProductsPanel } from "@/components/AdminProductsPanel";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { initials } from "@/lib/auth";
import { toast } from "sonner";
import {
  adminOverview, setAdmin, addAdminByEmail, removeAccount, moderateMember,
  upsertChallenge, removeChallenge, adminMessages,
} from "@/lib/admin.functions";
import { broadcastNotification } from "@/lib/push.functions";
import type { AdminChallenge } from "@/lib/admin.types";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console — MAXOUT" },
      { name: "description", content: "Manage MAXOUT admins, members, challenges, and moderation from one console." },
      { property: "og:title", content: "Admin Console — MAXOUT" },
      { property: "og:description", content: "Manage admins, members, challenges, and moderation for MAXOUT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHome,
});

type Tab = "overview" | "members" | "challenges" | "products" | "messages" | "notify";

function AdminHome() {
  const qc = useQueryClient();
  const load = useServerFn(adminOverview);
  const [tab, setTab] = useState<Tab>("overview");

  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => load({ data: undefined as never }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-overview"] });

  return (
    <AppShell>
      <div className="px-5 pb-28 pt-6">
        <Link to="/profile" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Shield className="h-5 w-5 text-accent" /> Admin console
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Everything that runs MAXOUT, in one place.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["overview", "members", "challenges", "products", "messages", "notify"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full py-2 text-[11px] font-semibold capitalize transition active:scale-95 ${
                tab === t ? "bg-foreground text-background" : "border border-border text-muted-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>


        {tab !== "products" && tab !== "messages" && tab !== "notify" && q.isLoading && (
          <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
        {tab !== "products" && tab !== "messages" && tab !== "notify" && q.error && (
          <p className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {q.error instanceof Error ? q.error.message : "Could not load admin data."}
          </p>
        )}

        {q.data && tab === "overview" && <Overview stats={q.data.stats} />}
        {q.data && tab === "members" && <Members members={q.data.members} onDone={refresh} />}
        {q.data && tab === "challenges" && <Challenges list={q.data.challenges} onDone={refresh} />}
        {tab === "products" && <AdminProductsPanel />}
        {tab === "messages" && <MessagesPanel />}
        {tab === "notify" && <NotifyPanel />}
      </div>
    </AppShell>
  );
}

function NotifyPanel() {
  const send = useServerFn(broadcastNotification);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [audience, setAudience] = useState<"all" | "elite">("all");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await send({ data: { title, body, url, audience } });
      toast.success(`Sent to ${res.stored} members · ${res.pushed} devices`);
      setTitle(""); setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-3xl border border-border bg-surface p-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Bell className="h-3.5 w-3.5" /> Send a notification
        </p>
        <div className="mt-3 space-y-2">
          <Field label="Title" value={title} onChange={setTitle} placeholder="New drop is live" />
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="The Summer collection just dropped — ELITE early access ends tonight."
              className="mt-1 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
            />
          </label>
          <Field label="Opens (path)" value={url} onChange={setUrl} placeholder="/shop" />
          <div className="grid grid-cols-2 gap-2">
            {(["all", "elite"] as const).map((a) => (
              <button key={a} onClick={() => setAudience(a)}
                className={`rounded-full py-2.5 text-xs font-semibold capitalize transition active:scale-95 ${
                  audience === a ? "bg-foreground text-background" : "border border-border text-muted-foreground"
                }`}>
                {a === "all" ? "All members" : "ELITE only"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={submit} disabled={busy || !title.trim() || !body.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send notification"}
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Members who turned on notifications get it on their device instantly. Everyone else sees it next time they open the app.
      </p>
    </div>
  );
}


function MessagesPanel() {
  const load = useServerFn(adminMessages);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const m = useQuery({ queryKey: ["admin-messages", search], queryFn: () => load({ data: { search } }) });

  return (
    <div className="mt-6">
      <form
        onSubmit={(e) => { e.preventDefault(); setSearch(term.trim()); }}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-4"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search message text"
          className="h-11 flex-1 bg-transparent text-sm outline-none"
        />
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Moderation view — every private message on MAXOUT, newest first.
      </p>

      {m.isLoading && <div className="mt-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {m.error && (
        <p className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {m.error instanceof Error ? m.error.message : "Could not load messages."}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {(m.data ?? []).length === 0 && !m.isLoading && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No messages found.
          </p>
        )}
        {(m.data ?? []).map((row) => (
          <div key={row.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {row.from.name ?? row.from.username ?? "Athlete"}
              </span>{" "}
              →{" "}
              <span className="font-semibold text-foreground">
                {row.to.name ?? row.to.username ?? "Athlete"}
              </span>{" "}
              · {new Date(row.createdAt).toLocaleString()}
              {!row.readAt && " · unread"}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug">{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ stats }: { stats: { members: number; posts: number; workouts: number; meals: number; elite: number; challenges: number } }) {
  const cells = [
    { label: "Members", value: stats.members },
    { label: "ELITE", value: stats.elite },
    { label: "Posts", value: stats.posts },
    { label: "Workouts", value: stats.workouts },
    { label: "Meals logged", value: stats.meals },
    { label: "Challenges", value: stats.challenges },
  ];
  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-3xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-semibold tracking-tight">{c.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

    </div>
  );
}



function Members({ members, onDone }: { members: import("@/lib/admin.types").AdminMember[]; onDone: () => void }) {
  const [term, setTerm] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const promote = useServerFn(addAdminByEmail);
  const toggleAdmin = useServerFn(setAdmin);
  const moderate = useServerFn(moderateMember);
  const del = useServerFn(removeAccount);

  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return members;
    return members.filter((m) =>
      [m.email, m.username, m.displayName].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [members, term]);

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key);
    try {
      const res = (await fn()) as { ok?: boolean; error?: string };
      if (res && res.ok === false) toast.error(res.error ?? "Failed");
      else toast.success(okMsg);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Add an admin</p>
        <div className="mt-2 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            inputMode="email"
            className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none"
          />
          <button
            disabled={!email.trim() || busy === "promote"}
            onClick={() => run("promote", () => promote({ data: { email } }).then((r) => { setEmail(""); return r; }), "Admin added")}
            className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search members"
          className="w-full bg-transparent text-sm outline-none" />
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {list.length} members
      </p>

      <div className="mt-2 space-y-2">
        {list.map((m) => (
          <div key={m.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <MediaImage
                src={m.avatarUrl}
                alt={m.displayName ?? "Member avatar"}
                className="h-10 w-10 rounded-full object-cover"
                fallback={
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-background text-xs font-semibold">
                    {initials(m.displayName ?? m.username ?? "?")}
                  </span>
                }
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">
                  {m.displayName ?? m.username ?? "Member"} {m.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{m.email ?? m.username ?? m.id.slice(0, 8)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {m.isAdmin && <Tag>Admin</Tag>}
                {m.isElite && <Tag>Elite</Tag>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Action busy={busy === `a${m.id}`} onClick={() => run(`a${m.id}`, () => toggleAdmin({ data: { userId: m.id, makeAdmin: !m.isAdmin } }), m.isAdmin ? "Admin removed" : "Admin added")}>
                <Shield className="h-3 w-3" /> {m.isAdmin ? "Remove admin" : "Make admin"}
              </Action>
              <Action busy={busy === `v${m.id}`} onClick={() => run(`v${m.id}`, () => moderate({ data: { userId: m.id, action: m.verified ? "unverify" : "verify" } }), "Updated")}>
                <BadgeCheck className="h-3 w-3" /> {m.verified ? "Unverify" : "Verify"}
              </Action>
              <Action busy={busy === `e${m.id}`} onClick={() => run(`e${m.id}`, () => moderate({ data: { userId: m.id, action: m.isElite ? "uncomp" : "comp" } }), "Membership updated")}>
                <Crown className="h-3 w-3" /> {m.isElite ? "Remove ELITE" : "Comp ELITE"}
              </Action>
              <Action busy={busy === `w${m.id}`} onClick={() => run(`w${m.id}`, () => moderate({ data: { userId: m.id, action: "wipe" } }), "Content removed")}>
                <Eraser className="h-3 w-3" /> Wipe posts
              </Action>
              <Action danger busy={busy === `d${m.id}`} onClick={() => setConfirmDelete(m.id)}>
                <Trash2 className="h-3 w-3" /> Delete
              </Action>
            </div>

            {confirmDelete === m.id && (
              <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">Permanently delete this account and all of its data?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(null); run(`d${m.id}`, () => del({ data: { userId: m.id } }), "Account deleted"); }}
                    className="flex-1 rounded-full bg-destructive py-2 text-xs font-semibold text-background"
                  >
                    Delete forever
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-full border border-border py-2 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{children}</span>;
}

function Action({ children, onClick, busy, danger }: { children: React.ReactNode; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition active:scale-95 disabled:opacity-40 ${
        danger ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground"
      }`}>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : children}
    </button>
  );
}

const EMPTY = { title: "", description: "", goalLabel: "", startsOn: new Date().toISOString().slice(0, 10), endsOn: "", imageUrl: "" };

function Challenges({ list, onDone }: { list: AdminChallenge[]; onDone: () => void }) {
  const save = useServerFn(upsertChallenge);
  const del = useServerFn(removeChallenge);
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await save({ data: form });
      toast.success(form.id ? "Challenge updated" : "Challenge created");
      setForm(EMPTY);
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {!open && (
        <button onClick={() => { setForm(EMPTY); setOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition">
          <Plus className="h-4 w-4" /> New challenge
        </button>
      )}

      {open && (
        <div className="rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{form.id ? "Edit challenge" : "New challenge"}</p>
            <button onClick={() => { setOpen(false); setForm(EMPTY); }}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="mt-3 space-y-2">
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="30-day push challenge" />
            <Field label="Goal" value={form.goalLabel} onChange={(v) => setForm({ ...form, goalLabel: v })} placeholder="20 workouts" />
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What it takes to win" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Starts" type="date" value={form.startsOn} onChange={(v) => setForm({ ...form, startsOn: v })} />
              <Field label="Ends" type="date" value={form.endsOn} onChange={(v) => setForm({ ...form, endsOn: v })} />
            </div>
            <Field label="Image URL" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} placeholder="https://…" />
          </div>
          <button onClick={submit} disabled={busy || !form.title.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save challenge"}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background"><Flag className="h-4 w-4 text-accent" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {c.startsOn}{c.endsOn ? ` → ${c.endsOn}` : ""} · {c.participants} joined
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <Action onClick={() => {
                setForm({
                  id: c.id, title: c.title, description: c.description ?? "", goalLabel: c.goalLabel ?? "",
                  startsOn: c.startsOn, endsOn: c.endsOn ?? "", imageUrl: c.imageUrl ?? "",
                });
                setOpen(true);
              }}>Edit</Action>
              <Action danger onClick={async () => {
                await del({ data: { id: c.id } });
                toast.success("Challenge deleted");
                onDone();
              }}><Trash2 className="h-3 w-3" /> Delete</Action>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none" />
    </label>
  );
}
