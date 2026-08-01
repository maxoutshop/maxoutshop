export type TemplateExercise = {
  name: string;
  sets: number;
  reps: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  category: string;
  focus: string;
  exercises: TemplateExercise[];
  tips?: string[];
};

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "chest",
    name: "Chest",
    category: "Chest",
    focus: "Press + fly volume",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6–8" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8–10" },
      { name: "Chest Fly (Cable or Machine)", sets: 3, reps: "10–12" },
      { name: "Dips (Chest Lean)", sets: 3, reps: "8–12" },
      { name: "Push-ups (to failure)", sets: 2, reps: "AMRAP" },
    ],
  },
  {
    id: "back",
    name: "Back",
    category: "Back",
    focus: "Vertical + horizontal pull",
    exercises: [
      { name: "Pull-ups or Assisted Pull-ups", sets: 4, reps: "6–10" },
      { name: "Lat Pulldown", sets: 3, reps: "10–12" },
      { name: "Barbell Row", sets: 4, reps: "8–10" },
      { name: "Seated Cable Row", sets: 3, reps: "10–12" },
      { name: "Straight Arm Pulldown", sets: 3, reps: "12–15" },
    ],
  },
  {
    id: "biceps",
    name: "Biceps",
    category: "Arms",
    focus: "Curl volume",
    exercises: [
      { name: "Barbell Curl", sets: 3, reps: "8–10" },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "10–12" },
      { name: "Hammer Curl", sets: 3, reps: "10–12" },
      { name: "Cable Curl", sets: 3, reps: "12–15" },
    ],
  },
  {
    id: "triceps",
    name: "Triceps",
    category: "Arms",
    focus: "Press + extension",
    exercises: [
      { name: "Close-Grip Bench Press", sets: 3, reps: "8–10" },
      { name: "Rope Pushdown", sets: 3, reps: "10–12" },
      { name: "Overhead Cable Extension", sets: 3, reps: "10–12" },
      { name: "Skull Crushers", sets: 3, reps: "8–10" },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    category: "Legs",
    focus: "Squat, hinge, accessories",
    exercises: [
      { name: "Back Squat", sets: 4, reps: "6–8" },
      { name: "Romanian Deadlift", sets: 3, reps: "8–10" },
      { name: "Leg Press", sets: 3, reps: "10–12" },
      { name: "Walking Lunges", sets: 3, reps: "10 each leg" },
      { name: "Leg Curl", sets: 3, reps: "10–12" },
      { name: "Leg Extension", sets: 3, reps: "12–15" },
      { name: "Standing Calf Raises", sets: 4, reps: "12–15" },
    ],
  },
  {
    id: "abs",
    name: "Abs",
    category: "Core",
    focus: "Core control",
    exercises: [
      { name: "Hanging Leg Raises", sets: 3, reps: "12–15" },
      { name: "Cable Crunches", sets: 3, reps: "15" },
      { name: "Ab Wheel Rollouts", sets: 3, reps: "10–12" },
      { name: "Plank", sets: 3, reps: "45–60 sec" },
    ],
  },
  {
    id: "cardio",
    name: "Cardio",
    category: "Cardio",
    focus: "Pick one",
    exercises: [
      { name: "Incline Treadmill Walk", sets: 1, reps: "20–30 min · 3–3.5 mph · 10–15%" },
      { name: "StairMaster", sets: 1, reps: "20 min" },
      { name: "Outdoor Walk", sets: 1, reps: "45 min" },
      { name: "Bike", sets: 1, reps: "30 min" },
    ],
  },
  {
    id: "push",
    name: "Push Day",
    category: "Full Body",
    focus: "Chest · shoulders · triceps",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6–8" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8–10" },
      { name: "Overhead Press", sets: 3, reps: "8–10" },
      { name: "Lateral Raise", sets: 3, reps: "12–15" },
      { name: "Rope Pushdown", sets: 3, reps: "10–12" },
    ],
  },
  {
    id: "pull",
    name: "Pull Day",
    category: "Full Body",
    focus: "Back · biceps",
    exercises: [
      { name: "Pull-ups or Assisted Pull-ups", sets: 4, reps: "6–10" },
      { name: "Barbell Row", sets: 4, reps: "8–10" },
      { name: "Lat Pulldown", sets: 3, reps: "10–12" },
      { name: "Barbell Curl", sets: 3, reps: "8–10" },
      { name: "Hammer Curl", sets: 3, reps: "10–12" },
    ],
  },
];

export const GROWTH_TIPS = [
  "Rest 2–3 min on heavy compounds, 60–90 sec on isolation work.",
  "Add a rep or a little weight each week — progressive overload.",
  "Eat 180–200 g of protein per day.",
  "Sleep 8–9 hours whenever possible.",
  "Warm up 5–10 min, plus 1–2 lighter sets before your first heavy lift.",
];

export const EXERCISE_LIBRARY = Array.from(
  new Set(WORKOUT_TEMPLATES.flatMap((t) => t.exercises.map((e) => e.name))),
).sort();
