import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPushConfig } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  enabled: boolean;
  busy: boolean;
  error: string | null;
};

/** Registers the service worker and manages this device's push subscription. */
export function usePushReminders(userId?: string) {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "unsupported",
    enabled: false,
    busy: false,
    error: null,
  });

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) return;
    let cancelled = false;
    (async () => {
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (cancelled) return;
      setState((s) => ({
        ...s,
        supported: true,
        permission: Notification.permission,
        enabled: !!sub && Notification.permission === "granted",
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  const enable = useCallback(async () => {
    if (!userId) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, busy: false, permission, error: "Notifications are blocked in your browser settings." }));
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = await getPushConfig();
      if (!publicKey) throw new Error("Push isn't configured yet.");

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint!,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          reminders_enabled: true,
          tz_offset_minutes: new Date().getTimezoneOffset(),
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
      setState((s) => ({ ...s, busy: false, enabled: true, permission: "granted" }));
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: e instanceof Error ? e.message : "Could not turn on reminders." }));
    }
  }, [userId]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, busy: false, enabled: false }));
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: e instanceof Error ? e.message : "Could not turn off reminders." }));
    }
  }, []);

  return { ...state, enable, disable };
}
