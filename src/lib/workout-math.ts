/** Shared workout math. Kept dependency-free so both UI and analytics can use it. */

export type SetRow = {
  id?: string;
  exercise: string;
  weight: number | null;
  reps: number | null;
  set_index?: number;
  created_at?: string;
};

/**
 * Epley estimated one-rep max: weight × (1 + reps / 30).
 * This is an ESTIMATE derived from a submaximal set, never a recorded lift.
 */
export function epley1RM(weight: number | null, reps: number | null): number {
  if (!weight || !reps || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function setVolume(s: SetRow): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export function totalVolume(sets: SetRow[]): number {
  return sets.reduce((a, s) => a + setVolume(s), 0);
}

export function bestSet(sets: SetRow[]): SetRow | null {
  let best: SetRow | null = null;
  for (const s of sets) {
    if (!s.weight) continue;
    if (!best || (s.weight ?? 0) > (best.weight ?? 0)) best = s;
  }
  return best;
}

export function bestEstimated1RM(sets: SetRow[]): { value: number; set: SetRow | null } {
  let value = 0;
  let set: SetRow | null = null;
  for (const s of sets) {
    const e = epley1RM(s.weight, s.reps);
    if (e > value) { value = e; set = s; }
  }
  return { value, set };
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** Consecutive-day training streak ending today (or yesterday, still alive). */
export function streakFromDates(dates: Array<string | Date>): { current: number; longest: number } {
  const days = Array.from(
    new Set(dates.map((d) => new Date(d).toDateString())),
  ).map((s) => new Date(s).getTime()).sort((a, b) => a - b);
  if (!days.length) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i]! - days[i - 1]!) / 864e5);
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const set = new Set(days.map((t) => new Date(t).toDateString()));
  let current = 0;
  const cursor = new Date();
  if (!set.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toDateString())) { current++; cursor.setDate(cursor.getDate() - 1); }

  return { current, longest };
}
