import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushReminders } from "@/lib/push";

/** Daily nutrition reminder opt-in for this device. */
export function RemindersCard({ userId }: { userId?: string }) {
  const push = usePushReminders(userId);
  if (!push.supported) return null;

  return (
    <section className="mt-5 flex items-center gap-3 rounded-3xl border border-border bg-surface p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-background">
        {push.enabled ? <Bell className="h-5 w-5 text-accent" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nutrition reminders</p>
        <p className="text-xs text-muted-foreground">
          {push.error
            ? push.error
            : push.enabled
              ? "On — we'll nudge you if you're short on calories or protein."
              : "Get a daily nudge to hit your calories and protein."}
        </p>
      </div>
      <button
        onClick={() => (push.enabled ? push.disable() : push.enable())}
        disabled={push.busy || !userId}
        className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-40 ${
          push.enabled ? "border border-border text-muted-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {push.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : push.enabled ? "Turn off" : "Turn on"}
      </button>
    </section>
  );
}
