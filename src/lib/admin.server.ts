import { adminDb } from "./membership.server";

import type { AdminMember, AdminChallenge } from "./admin.types";

export type { AdminMember, AdminChallenge };

/** Throws unless the given user has the admin role. */
export async function assertAdmin(userId: string) {
  const db = adminDb();
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").limit(1);
  if (!data || data.length === 0) throw new Error("Admins only.");
}

export async function listMembers(): Promise<AdminMember[]> {
  const db = adminDb();
  const [{ data: profiles }, { data: roles }, authList] = await Promise.all([
    db.from("profiles").select("id, username, display_name, avatar_url, verified, is_elite, created_at").order("created_at", { ascending: false }).limit(500),
    db.from("user_roles").select("user_id, role"),
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);

  const emails = new Map<string, string | null>();
  for (const u of authList?.data?.users ?? []) emails.set(u.id, u.email ?? null);
  const adminIds = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    email: emails.get(p.id) ?? null,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    verified: !!p.verified,
    isElite: !!p.is_elite,
    isAdmin: adminIds.has(p.id),
    createdAt: p.created_at ?? null,
  }));
}

export async function setAdminRole(userId: string, makeAdmin: boolean) {
  const db = adminDb();
  if (makeAdmin) {
    await db.from("user_roles").insert({ user_id: userId, role: "admin" });
  } else {
    await db.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
  }
}

/** Find a member by email address (used to promote someone by email). */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = adminDb();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = (data?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

export async function deleteAccount(userId: string) {
  const db = adminDb();
  await db.auth.admin.deleteUser(userId);
}

export async function listChallenges(): Promise<AdminChallenge[]> {
  const db = adminDb();
  const [{ data: rows }, { data: parts }] = await Promise.all([
    db.from("challenges").select("*").order("starts_on", { ascending: false }),
    db.from("challenge_participants").select("challenge_id"),
  ]);
  const counts = new Map<string, number>();
  for (const p of parts ?? []) counts.set(p.challenge_id, (counts.get(p.challenge_id) ?? 0) + 1);
  return (rows ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    goalLabel: c.goal_label,
    startsOn: c.starts_on,
    endsOn: c.ends_on,
    rewardPoints: c.reward_points,
    imageUrl: c.image_url,
    participants: counts.get(c.id) ?? 0,
  }));
}

export type ChallengeInput = {
  id?: string;
  title: string;
  description?: string;
  goalLabel?: string;
  startsOn: string;
  endsOn?: string;
  imageUrl?: string;
};

export async function saveChallenge(input: ChallengeInput) {
  const db = adminDb();
  const row = {
    title: input.title,
    description: input.description || null,
    goal_label: input.goalLabel || null,
    starts_on: input.startsOn,
    ends_on: input.endsOn || null,
    image_url: input.imageUrl || null,
  };
  if (input.id) {
    await db.from("challenges").update(row).eq("id", input.id);
    return input.id;
  }
  const { data } = await db.from("challenges").insert(row).select("id").single();
  return data?.id ?? null;
}

export async function deleteChallenge(id: string) {
  const db = adminDb();
  await db.from("challenge_participants").delete().eq("challenge_id", id);
  await db.from("challenges").delete().eq("id", id);
}

export async function setVerified(userId: string, verified: boolean) {
  const db = adminDb();
  await db.from("profiles").update({ verified }).eq("id", userId);
}

/** Comp or revoke ELITE for a member without Stripe. */
export async function setComped(userId: string, months: number | null) {
  const db = adminDb();
  const { refreshEliteFlag } = await import("./membership.server");
  if (months === null) {
    await db.from("elite_grants").delete().eq("user_id", userId).eq("code", "ADMIN-COMP");
  } else {
    // elite_grants.code references promo_codes.code, so make sure the comp code exists.
    await db.from("promo_codes").upsert(
      { code: "ADMIN-COMP", label: "Admin comp", grant_months: months, max_redemptions: 1000000, active: true },
      { onConflict: "code" },
    );
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    await db.from("elite_grants").insert({ user_id: userId, code: "ADMIN-COMP", expires_at: expires.toISOString() });
  }
  return await refreshEliteFlag(userId);
}

export async function adminStats() {
  const db = adminDb();
  const count = async (table: string) => {
    const { count: c } = await db.from(table).select("*", { count: "exact", head: true });
    return c ?? 0;
  };
  const [members, posts, workouts, meals, elite, challenges] = await Promise.all([
    count("profiles"),
    count("posts"),
    count("workouts"),
    count("meals"),
    (async () => {
      const { count: c } = await db.from("profiles").select("*", { count: "exact", head: true }).eq("is_elite", true);
      return c ?? 0;
    })(),
    count("challenges"),
  ]);
  return { members, posts, workouts, meals, elite, challenges };
}

/** Delete every post and comment authored by a member (moderation). */
export async function wipeContent(userId: string) {
  const db = adminDb();
  await db.from("post_comments").delete().eq("user_id", userId);
  await db.from("posts").delete().eq("user_id", userId);
}

/** All direct messages across the platform (moderation view). */
export async function listMessages(search: string): Promise<import("./admin.types").AdminMessage[]> {
  const db = adminDb();
  let req = db.from("direct_messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (search) req = req.ilike("body", `%${search}%`);
  const { data: rows } = await req;
  const ids = new Set<string>();
  for (const m of rows ?? []) { ids.add(m.sender_id); ids.add(m.recipient_id); }
  const { data: profiles } = ids.size
    ? await db.from("profiles").select("id, display_name, username").in("id", [...ids])
    : { data: [] as any[] };
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const who = (id: string) => ({
    id,
    name: byId.get(id)?.display_name ?? null,
    username: byId.get(id)?.username ?? null,
  });
  return (rows ?? []).map((m: any) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
    from: who(m.sender_id),
    to: who(m.recipient_id),
  }));
}
