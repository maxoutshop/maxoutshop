import { useState } from "react";
import { BottomSheet, Stepper, PrimaryButton } from "@/components/LogSheet";
import { Target } from "lucide-react";

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number | null;
};

export function GoalsSheet({
  initial, onClose, onSave,
}: {
  initial: Goals;
  onClose: () => void;
  onSave: (g: Goals) => void;
}) {
  const [g, setG] = useState<Goals>(initial);
  return (
    <BottomSheet title="Your goals" subtitle="Daily targets and where you're headed" onClose={onClose}>
      <div className="space-y-3">
        <Stepper label="Calories / day" value={g.calories} onChange={(v) => setG({ ...g, calories: v })} step={50} suffix="cal" />
        <Stepper label="Protein / day" value={g.protein} onChange={(v) => setG({ ...g, protein: v })} step={5} suffix="g" />
        <Stepper label="Carbs / day" value={g.carbs} onChange={(v) => setG({ ...g, carbs: v })} step={5} suffix="g" />
        <Stepper label="Fat / day" value={g.fat} onChange={(v) => setG({ ...g, fat: v })} step={5} suffix="g" />
        <Stepper label="Goal weight" value={g.weight ?? 180} onChange={(v) => setG({ ...g, weight: v })} step={1} suffix="lb" />
      </div>
      <PrimaryButton onClick={() => onSave(g)}>
        <Target className="h-4 w-4" /> Save goals
      </PrimaryButton>
    </BottomSheet>
  );
}
