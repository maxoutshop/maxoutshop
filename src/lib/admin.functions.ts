import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AdminMember, AdminChallenge } from "./admin.types";

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    members: AdminMember[];
    challenges: AdminChallenge[];
    stats: { members: number; posts: number; workouts: number; meals: number; elite: number; challenges: number };
  }> => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    const [members, challenges, stats] = await Promise.all([a.listMembers(), a.listChallenges(), a.adminStats()]);
    return { members, challenges, stats };
  });

export const setAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; makeAdmin: boolean }) => ({
    userId: String(d?.userId ?? ""),
    makeAdmin: !!d?.makeAdmin,
  }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    if (!data.makeAdmin && data.userId === context.userId) throw new Error("You can't remove your own admin access.");
    await a.setAdminRole(data.userId, data.makeAdmin);
    return { ok: true };
  });

export const addAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => ({ email: String(d?.email ?? "").trim().slice(0, 200) }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    const id = await a.findUserIdByEmail(data.email);
    if (!id) return { ok: false as const, error: "No account with that email." };
    await a.setAdminRole(id, true);
    return { ok: true as const };
  });

export const removeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => ({ userId: String(d?.userId ?? "") }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You can't delete your own account here.");
    await a.deleteAccount(data.userId);
    return { ok: true };
  });

export const moderateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; action: "verify" | "unverify" | "comp" | "uncomp" | "wipe" }) => ({
    userId: String(d?.userId ?? ""),
    action: d.action,
  }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    if (data.action === "verify" || data.action === "unverify") {
      await a.setVerified(data.userId, data.action === "verify");
    } else if (data.action === "comp") {
      await a.setComped(data.userId, 12);
    } else if (data.action === "uncomp") {
      await a.setComped(data.userId, null);
    } else {
      await a.wipeContent(data.userId);
    }
    return { ok: true };
  });

export const upsertChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; title: string; description?: string; goalLabel?: string;
    startsOn: string; endsOn?: string; imageUrl?: string;
  }) => {
    const title = String(d?.title ?? "").trim().slice(0, 120);
    if (!title) throw new Error("Title is required.");
    return {
      id: d.id ? String(d.id) : undefined,
      title,
      description: String(d?.description ?? "").slice(0, 600),
      goalLabel: String(d?.goalLabel ?? "").slice(0, 80),
      startsOn: String(d?.startsOn ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      endsOn: String(d?.endsOn ?? "").slice(0, 10),
      imageUrl: String(d?.imageUrl ?? "").slice(0, 600),
    };
  })
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    const id = await a.saveChallenge(data);
    return { ok: true, id };
  });

export const removeChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    await a.deleteChallenge(data.id);
    return { ok: true };
  });

export const adminMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => ({ search: String(d?.search ?? "").trim().slice(0, 120) }))
  .handler(async ({ data, context }): Promise<import("./admin.types").AdminMessage[]> => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    return a.listMessages(data.search);
  });

export const adminPointsMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => ({ search: String(d?.search ?? "").trim().slice(0, 120) }))
  .handler(async ({ data, context }): Promise<import("./admin.types").AdminPointsMember[]> => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    return a.listPointsMembers(data.search);
  });

export const adjustMemberPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; delta: number; reason?: string }) => {
    const delta = Math.trunc(Number(d?.delta ?? 0));
    if (!delta || Math.abs(delta) > 1000000) throw new Error("Enter a point amount.");
    return { userId: String(d?.userId ?? ""), delta, reason: String(d?.reason ?? "").slice(0, 120) };
  })
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    await a.adjustPoints(data.userId, data.delta, data.reason);
    return { ok: true };
  });

export const adminPointsConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    settings: import("./admin.types").PointsSettings;
    rewards: import("./admin.types").AdminReward[];
  }> => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    const [settings, rewards] = await Promise.all([a.getPointsSettings(), a.listRewardsAdmin()]);
    return { settings, rewards };
  });

export const savePointsRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workoutPoints: number; prPoints: number }) => {
    const clamp = (n: unknown) => Math.max(0, Math.min(1000, Math.trunc(Number(n) || 0)));
    return { workoutPoints: clamp(d?.workoutPoints), prPoints: clamp(d?.prPoints) };
  })
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    await a.savePointsSettings(data);
    return { ok: true };
  });

export const upsertReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; title: string; description?: string; kind?: string;
    pointsCost: number; active?: boolean; stock?: number | null;
  }) => {
    const title = String(d?.title ?? "").trim().slice(0, 120);
    if (!title) throw new Error("Title is required.");
    const stockRaw = d?.stock;
    return {
      id: d.id ? String(d.id) : undefined,
      title,
      description: String(d?.description ?? "").slice(0, 400),
      kind: String(d?.kind ?? "perk").slice(0, 40),
      pointsCost: Math.max(0, Math.trunc(Number(d?.pointsCost) || 0)),
      active: d?.active !== false,
      stock: stockRaw === null || stockRaw === undefined || stockRaw === ("" as never) ? null : Math.max(0, Math.trunc(Number(stockRaw) || 0)),
    };
  })
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    const id = await a.saveReward(data);
    return { ok: true, id };
  });

export const removeReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    await a.deleteReward(data.id);
    return { ok: true };
  });

export const adminRedemptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) => ({ status: String(d?.status ?? "pending") }))
  .handler(async ({ data, context }): Promise<import("./admin.types").AdminRedemption[]> => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    return a.listRedemptions(data.status);
  });

export const setRedemptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "fulfilled" | "canceled"; notes?: string }) => ({
    id: String(d?.id ?? ""),
    status: d.status,
    notes: String(d?.notes ?? "").slice(0, 300),
  }))
  .handler(async ({ data, context }) => {
    const a = await import("./admin.server");
    await a.assertAdmin(context.userId);
    await a.setRedemptionStatus(data.id, data.status, data.notes);
    return { ok: true };
  });
