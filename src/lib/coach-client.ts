/**
 * Transport-aware MAXOUT Coach client.
 *
 * Web  → the `askCoach` TanStack server function (same origin).
 * iOS  → `/api/public/mobile/coach` on the published site with a Supabase
 *        bearer token, because the Capacitor webview is cross-origin.
 *
 * Both paths run the SAME server-side ELITE verification.
 */
import { IS_NATIVE_BUILD, apiUrl } from "./api-base";
import { supabase } from "@/integrations/supabase/client";
import { askCoach } from "./coach.functions";

export type CoachMessage = { role: "user" | "assistant"; content: string };

export async function sendCoachMessage(messages: CoachMessage[]): Promise<string> {
  if (IS_NATIVE_BUILD) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(apiUrl("/api/public/mobile/coach"), {
        method: "POST",
        headers,
        body: JSON.stringify({ messages }),
      });
    } catch {
      throw new Error("Can't reach MAXOUT servers. Check your connection.");
    }
    const json = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null;
    if (!res.ok || json?.error || !json?.reply) throw new Error(json?.error ?? `Coach failed (${res.status})`);
    return json.reply;
  }

  const res = await askCoach({ data: { messages } });
  if (res.error || !res.reply) throw new Error(res.error ?? "Coach is unavailable right now.");
  return res.reply;
}
