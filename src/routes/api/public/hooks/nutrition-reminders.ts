import { createFileRoute } from "@tanstack/react-router";

/** Hourly cron: nudge members who haven't hit their nutrition goals today. */
export const Route = createFileRoute("/api/public/hooks/nutrition-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { adminDb } = await import("@/lib/membership.server");
        const { notifyUsers } = await import("@/lib/push.server");
        const db = adminDb();

        const { data: subs } = await db
          .from("push_subscriptions")
          .select("user_id, reminder_hour, tz_offset_minutes")
          .eq("reminders_enabled", true);

        const now = Date.now();
        const due = new Map<string, void>();
        for (const s of (subs ?? []) as Array<{ user_id: string; reminder_hour: number; tz_offset_minutes: number }>) {
          const local = new Date(now - (s.tz_offset_minutes ?? 0) * 60_000);
          if (local.getUTCHours() === (s.reminder_hour ?? 19)) due.set(s.user_id, undefined);
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
