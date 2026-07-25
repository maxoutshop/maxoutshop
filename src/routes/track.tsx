import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Flame, Trophy, Dumbbell, Utensils, Droplet, TrendingUp, Plus, Lock } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track — MAXOUT" }, { name: "description", content: "Track workouts, PRs, nutrition, and progress." }] }),
  component: Track,
});

function Track() {
  return (
    <AppShell>
      <div className="pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">Today</p>
        <h1 className="mt-1 text-3xl font-semibold">Your Track</h1>
      </div>

      {/* streak + weekly */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat icon={<Flame className="h-5 w-5 text-accent" />} value="12" label="Day streak" hint="+1 today" />
        <BigStat icon={<Dumbbell className="h-5 w-5" />} value="4/5" label="Workouts this week" hint="On pace" />
      </div>

      {/* macros */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nutrition</h2>
          <button className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Plus className="h-3.5 w-3.5" /> Log meal</button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <MacroRing label="Cals" value={1840} goal={2400} />
          <MacroRing label="Protein" value={128} goal={180} unit="g" />
          <MacroRing label="Carbs" value={190} goal={250} unit="g" />
          <MacroRing label="Fat" value={62} goal={80} unit="g" />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/60 p-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground"><Droplet className="h-4 w-4" /> Water</span>
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} className={`h-6 w-2 rounded-full ${i < 5 ? "bg-foreground" : "bg-secondary"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* workout */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workout</h2>
          <button className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Plus className="h-3.5 w-3.5" /> Start</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Pick a category to start logging.</p>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {["Chest","Back","Shoulders","Arms","Legs","Core","Full Body","Cardio","Sports","Custom"].map((c) => (
            <button key={c} className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">{c}</button>
          ))}
        </div>
      </section>

      {/* PRs */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Personal Records</h2>
          <Trophy className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-3 divide-y divide-border">
          {[
            { name: "Bench Press", val: "225 lb", diff: "+10 lb", date: "Nov 12" },
            { name: "Squat", val: "315 lb", diff: "+15 lb", date: "Nov 08" },
            { name: "Deadlift", val: "405 lb", diff: "+20 lb", date: "Nov 03" },
          ].map((pr) => (
            <div key={pr.name} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{pr.name}</p>
                <p className="text-xs text-muted-foreground">{pr.date} · {pr.diff}</p>
              </div>
              <span className="text-lg font-semibold tracking-tight">{pr.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* progress */}
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Weight</h2>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">182.4</span>
          <span className="text-sm text-muted-foreground">lb</span>
          <span className="ml-2 text-xs text-accent">−3.2 this month</span>
        </div>
        <MiniChart />
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground inline-flex items-center gap-1 w-full justify-center">
        <Lock className="h-3 w-3" /> Demo data shown. Real tracking activates after you create an account.
      </p>
    </AppShell>
  );
}

function BigStat({ icon, value, label, hint }: { icon: React.ReactNode; value: string; label: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      {icon}
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-[11px] text-accent">{hint}</div>
    </div>
  );
}

function MacroRing({ label, value, goal, unit = "" }: { label: string; value: number; goal: number; unit?: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <div className="relative mx-auto h-14 w-14">
        <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="4" />
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-foreground)" strokeWidth="4"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold">{pct}%</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium">{value}{unit}<span className="text-muted-foreground">/{goal}{unit}</span></div>
    </div>
  );
}

function MiniChart() {
  const points = [186, 185.2, 184.8, 184.5, 183.8, 183.2, 182.4];
  const min = Math.min(...points) - 0.5;
  const max = Math.max(...points) + 0.5;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((p - min) / (max - min)) * 100;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-20 w-full">
      <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#g)" opacity="0.4" />
      <path d={path} fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" />
      <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-foreground)" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
    </svg>
  );
}
