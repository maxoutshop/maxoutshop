import { createFileRoute } from "@tanstack/react-router";

/** Meal-time reminders: 8:00 breakfast, 12:30 lunch, 19:30 dinner (member local time). */
const SLOTS: Array<{ minutes: number; meal: string }> = [
  { minutes: 8 * 60, meal: "breakfast" },
  { minutes: 12 * 60 + 30, meal: "lunch" },
  { minutes: 19 * 60 + 30, meal: "dinner" },
];

export const Route = createFileRoute("/api/public/hooks/nutrition-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { adminDb } = await import("@/lib/membership.server");
        const { notifyUsers } = await import("@/lib/push.server");
        const db = adminDb();

        const { data: subs } = await db
          .from("push_subscriptions")
          .select("user_id, tz_offset_minutes")
          .eq("reminders_enabled", true);

        const now = Date.now();
        const due = new Map<string, string>();
        for (const s of (subs ?? []) as Array<{ user_id: string; tz_offset_minutes: number }>) {
          const local = new Date(now - (s.tz_offset_minutes ?? 0) * 60_000);
          const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
          const hit = SLOTS.find((slot) => Math.abs(mins - slot.minutes) < 15);
          if (hit) due.set(s.user_id, hit.meal);
        }
        const userIds = [...due.keys()];
        if (userIds.length === 0) return Response.json({ ok: true, sent: 0 });


        const { data: profiles } = await db
          .from("profiles")
          .select("id, goal_calories, goal_protein")
          .in("id", userIds);

        const since = new Date(now - 20 * 3600_000).toISOString();
        const { data: meals } = await db
          .from("meals")
          .select("user_id, calories, protein, logged_at")
          .in("user_id", userIds)
          .gte("logged_at", since);

        const totals = new Map<string, { cal: number; pro: number }>();
        for (const m of (meals ?? []) as Array<{ user_id: string; calories: number; protein: number }>) {
          const t = totals.get(m.user_id) ?? { cal: 0, pro: 0 };
          t.cal += m.calories ?? 0;
          t.pro += m.protein ?? 0;
          totals.set(m.user_id, t);
        }

        let sent = 0;
        for (const p of (profiles ?? []) as Array<{ id: string; goal_calories: number; goal_protein: number }>) {
          const t = totals.get(p.id) ?? { cal: 0, pro: 0 };
          const calLeft = Math.max(0, (p.goal_calories ?? 2400) - t.cal);
          const proLeft = Math.max(0, (p.goal_protein ?? 180) - t.pro);
          const body =
            calLeft === 0 && proLeft === 0
              ? "Goals hit today. Lock it in and log tomorrow's first meal."
              : `${calLeft} cal and ${proLeft}g protein left today. Finish strong.`;
          await notifyUsers([p.id], { title: "MAXOUT — fuel check", body, url: "/track", kind: "nutrition" });
          sent++;
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
