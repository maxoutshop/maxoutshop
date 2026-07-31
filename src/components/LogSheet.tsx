import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Camera, Loader2, Minus, Plus, Trash2, Pencil, Lock } from "lucide-react";
import { parseFood } from "@/lib/nutrition.functions";

export type MealDraft = {
  name: string;
  quantity?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border-t border-border bg-surface px-5 pb-12 pt-3 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full bg-background p-2 active:scale-95 transition">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function Stepper({
  label, value, onChange, step = 5, min = 0, suffix,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; suffix?: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border active:scale-90 transition">
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(Math.max(min, Number(e.target.value.replace(/[^\d.]/g, "")) || 0))}
            className="w-full bg-transparent text-center text-3xl font-semibold tracking-tight outline-none"
          />
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
        <button type="button" onClick={() => onChange(value + step)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border active:scale-90 transition">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BigInput({
  label, value, onChange, placeholder, suggestions = [],
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; suggestions?: string[] }) {
  const matches = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()).slice(0, 4)
    : suggestions.slice(0, 5);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-3xl border border-border bg-background px-5 py-4 text-lg font-medium outline-none placeholder:text-muted-foreground/60 focus:border-foreground/40"
      />
      {matches.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {matches.map((m) => (
            <button key={m} type="button" onClick={() => onChange(m)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground active:scale-95 transition">
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function guessMealType() {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function MealSheet({
  onClose, onSave, recent, isElite = false, onUpgrade,
}: {
  onClose: () => void;
  onSave: (items: MealDraft[], mealType: string) => void;
  recent: MealDraft[];
  isElite?: boolean;
  onUpgrade?: () => void;
}) {
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState<string>(guessMealType());
  const [items, setItems] = useState<MealDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(payload: { text?: string; imageDataUrl?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await parseFood({ data: payload });
      if (!res.items.length) setError("Couldn't read that — try adding a bit more detail.");
      setItems((prev) => [...prev, ...res.items]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => run({ imageDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const totals = items.reduce(
    (s, i) => ({ calories: s.calories + i.calories, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <BottomSheet title="Log food" subtitle="Describe it or snap it — AI does the macros" onClose={onClose}>
      <div className="flex gap-2">
        {MEAL_TYPES.map((t) => (
          <button key={t} onClick={() => setMealType(t)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize transition active:scale-95 ${
              mealType === t ? "bg-foreground text-background" : "border border-border text-muted-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-background p-4">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="chipotle bowl w/ double chicken, rice, guac"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => text.trim() && run({ text })}
            disabled={busy || !text.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Reading…" : "Estimate macros"}
          </button>
          <button
            onClick={() => (isElite ? fileRef.current?.click() : onUpgrade?.())}
            disabled={busy}
            aria-label={isElite ? "Log food by photo" : "Unlock photo logging with MAXOUT ELITE"}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-border active:scale-90 transition disabled:opacity-40"
          >
            <Camera className="h-4 w-4" />
            {!isElite && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent">
                <Lock className="h-2.5 w-2.5 text-background" />
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />

        </div>
      </div>

      {recent.length > 0 && items.length === 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Log again</p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {recent.map((r, i) => (
              <button key={`${r.name}-${i}`} onClick={() => setItems((p) => [...p, r])}
                className="shrink-0 rounded-full border border-border px-3.5 py-2 text-xs active:scale-95 transition">
                {r.name} <span className="text-muted-foreground">{r.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</p>}

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {items.map((it, idx) => (
            <ItemCard key={idx} item={it}
              onChange={(next) => setItems((p) => p.map((x, i) => (i === idx ? next : x)))}
              onRemove={() => setItems((p) => p.filter((_, i) => i !== idx))} />
          ))}
          <div className="flex items-center justify-between rounded-3xl bg-background px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">
              {totals.calories} cal · {totals.protein}p / {totals.carbs}c / {totals.fat}f
            </span>
          </div>
        </div>
      )}

      {manual && (
        <div className="mt-4">
          <ManualEntry onAdd={(i) => { setItems((p) => [...p, i]); setManual(false); }} />
        </div>
      )}

      {items.length > 0 && (
        <PrimaryButton onClick={() => onSave(items, mealType)}>
          Log {items.length} item{items.length > 1 ? "s" : ""}
        </PrimaryButton>
      )}

      {!manual && (
        <button onClick={() => setManual(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Pencil className="h-3.5 w-3.5" /> Enter manually instead
        </button>
      )}
    </BottomSheet>
  );
}

function ItemCard({ item, onChange, onRemove }: { item: MealDraft; onChange: (v: MealDraft) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.quantity ? `${item.quantity} · ` : ""}{item.protein}p / {item.carbs}c / {item.fat}f
          </p>
        </button>
        <span className="text-lg font-semibold tracking-tight">{item.calories}</span>
        <button onClick={onRemove} className="mt-1 active:scale-90 transition"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.slice(0, 4)}</span>
              <input
                inputMode="numeric"
                value={item[k]}
                onChange={(e) => onChange({ ...item, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualEntry({ onAdd }: { onAdd: (i: MealDraft) => void }) {
  const [v, setV] = useState<MealDraft>({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <input
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        placeholder="Food name"
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
          <label key={k} className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.slice(0, 4)}</span>
            <input
              inputMode="numeric"
              value={v[k] || ""}
              onChange={(e) => setV({ ...v, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none"
            />
          </label>
        ))}
      </div>
      <button
        onClick={() => v.name.trim() && onAdd(v)}
        className="mt-3 w-full rounded-full border border-border py-3 text-xs font-semibold active:scale-[0.98] transition"
      >
        Add item
      </button>
    </div>
  );
}
