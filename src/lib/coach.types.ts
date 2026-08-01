export type CoachInput = {
  heightIn: number;
  weightLb: number;
  goalWeightLb: number;
  age: number;
  sex: "male" | "female";
  activity: "sedentary" | "light" | "moderate" | "high" | "athlete";
  notes?: string;
};

export type CoachPlan = {
  headline: string;
  summary: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weeklyChangeLb: number;
  weeks: number;
  meals: Array<{ slot: string; idea: string; calories: number; protein: number }>;
  tips: string[];
};
