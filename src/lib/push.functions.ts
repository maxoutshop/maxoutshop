import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public — the VAPID public key the browser needs to subscribe. */
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { vapidPublicKey } = await import("./push.server");
  return { publicKey: vapidPublicKey() };
});

/** Admin — send an announcement to every member (or only ELITE members). */
export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; url?: string; audience?: "all" | "elite" }) => ({
    title: String(d?.title ?? "").trim().slice(0, 80),
    body: String(d?.body ?? "").trim().slice(0, 300),
    url: String(d?.url ?? "").trim().slice(0, 300),
    audience: d?.audience === "elite" ? ("elite" as const) : ("all" as const),
  }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    if (!data.title || !data.body) throw new Error("Title and message are required.");

    const { adminDb } = await import("./membership.server");
    const { notifyUsers } = await import("./push.server");

    let q = adminDb().from("profiles").select("id").limit(5000);
    if (data.audience === "elite") q = q.eq("is_elite", true);
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r: { id: string }) => r.id);

    const res = await notifyUsers(ids, {
      title: data.title,
      body: data.body,
      url: data.url || "/",
      kind: "announcement",
    });
    return { ok: true as const, ...res };
  });
