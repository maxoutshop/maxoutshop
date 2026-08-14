/**
 * Maintainable exercise -> muscle-group mapping.
 * Matching is keyword based so user-typed exercise names still resolve.
 */

export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Cardio", "Other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Ordered: first match wins, so put specific phrases above generic ones. */
const RULES: Array<[MuscleGroup, string[]]> = [
  ["Triceps", ["tricep", "pushdown", "skull crusher", "close-grip", "close grip", "overhead extension", "kickback", "dip"]],
  ["Biceps", ["bicep", "curl", "chin-up", "chin up", "preacher"]],
  ["Chest", ["bench press", "chest", "pec", "fly", "flye", "push-up", "push up", "pushup"]],
  ["Back", ["row", "pulldown", "pull-up", "pull up", "pullup", "lat ", "deadlift", "shrug", "back extension", "pullover"]],
  ["Shoulders", ["shoulder", "overhead press", "military", "lateral raise", "front raise", "rear delt", "delt", "upright row", "face pull", "arnold"]],
  ["Hamstrings", ["hamstring", "leg curl", "romanian", "rdl", "good morning", "nordic"]],
  ["Glutes", ["glute", "hip thrust", "kickback", "bridge"]],
  ["Calves", ["calf", "calves"]],
  ["Quads", ["squat", "leg press", "lunge", "leg extension", "step-up", "step up", "hack", "bulgarian", "sissy"]],
  ["Core", ["ab ", "abs", "crunch", "plank", "leg raise", "core", "oblique", "sit-up", "sit up", "hollow", "russian twist"]],
  ["Cardio", ["run", "treadmill", "stairmaster", "bike", "cycling", "row erg", "walk", "elliptical", "jump rope", "sprint", "cardio", "incline walk"]],
];

const cache = new Map<string, MuscleGroup>();

export function muscleGroupFor(exercise: string): MuscleGroup {
  const key = exercise.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  let found: MuscleGroup = "Other";
  for (const [group, words] of RULES) {
    if (words.some((w) => key.includes(w))) { found = group; break; }
  }
  cache.set(key, found);
  return found;
}

/** Hard-set count per muscle group. */
export function groupSetCounts(sets: Array<{ exercise: string }>): Array<{ group: MuscleGroup; sets: number }> {
  const map = new Map<MuscleGroup, number>();
  for (const s of sets) {
    const g = muscleGroupFor(s.exercise);
    map.set(g, (map.get(g) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([group, count]) => ({ group, sets: count }))
    .sort((a, b) => b.sets - a.sets);
}
