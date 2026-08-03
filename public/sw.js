/* MAXOUT service worker — push notifications */
const APP = self.registration.scope;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let notice = { title: "MAXOUT", body: "Open the app for details.", url: "/" };

      // Payload-less push: pull the pending notification for this device.
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const res = await fetch(
            `/api/public/push/pending?e=${encodeURIComponent(sub.endpoint)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.title) notice = data;
          }
        }
      } catch (_) {
        /* fall back to the generic notice */
      }

      await self.registration.showNotification(notice.title, {
        body: notice.body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: "maxout",
        renotify: true,
        data: { url: notice.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", APP).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.startsWith(APP)) {
          await c.focus();
          if ("navigate" in c) await c.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
