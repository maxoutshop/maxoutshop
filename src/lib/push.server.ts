/** Web Push (VAPID) sending — server only. Payload-less pushes; the service
 *  worker fetches the pending notification text from a public endpoint. */
import { adminDb } from "./membership.server";

function b64urlToBytes(s: string) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(b: ArrayBuffer | Uint8Array) {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonB64url(o: unknown) {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
}

export function vapidPublicKey() {
  return process.env["VAPID_PUBLIC_KEY"] ?? "";
}

async function vapidHeader(audience: string) {
  const priv = process.env["VAPID_PRIVATE_KEY"];
  const pub = process.env["VAPID_PUBLIC_KEY"];
  const sub = process.env["VAPID_SUBJECT"] ?? "mailto:support@maxoutshop.com";
  if (!priv || !pub) throw new Error("Push is not configured.");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    b64urlToBytes(priv) as unknown as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const unsigned =
    `${jsonB64url({ typ: "JWT", alg: "ES256" })}.` +
    jsonB64url({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub });
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned) as unknown as ArrayBuffer,
  );
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${pub}`;
}

/** Fire a payload-less push at one endpoint. Returns false if it's dead. */
export async function pushToEndpoint(endpoint: string): Promise<boolean> {
  const audience = new URL(endpoint).origin;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(audience),
      TTL: "86400",
      Urgency: "normal",
      "Content-Length": "0",
    },
  });
  if (res.status === 404 || res.status === 410) return false;
  if (!res.ok) {
    console.error(`[push] ${res.status} ${await res.text().catch(() => "")}`);
  }
  return true;
}

type Notice = { title: string; body: string; url?: string | null; kind?: string };

/** Store a notification for each user and wake up their devices. */
export async function notifyUsers(userIds: string[], notice: Notice) {
  if (userIds.length === 0) return { stored: 0, pushed: 0 };
  const db = adminDb();

  const rows = userIds.map((user_id) => ({
    user_id,
    title: notice.title,
    body: notice.body,
    url: notice.url ?? null,
    kind: notice.kind ?? "general",
  }));
  await db.from("notifications").insert(rows);

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint")
    .in("user_id", userIds);

  let pushed = 0;
  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s: { id: string; endpoint: string }) => {
      try {
        const alive = await pushToEndpoint(s.endpoint);
        if (alive) pushed++;
        else dead.push(s.id);
      } catch (e) {
        console.error("[push] send failed", e);
      }
    }),
  );
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);

  return { stored: rows.length, pushed };
}
