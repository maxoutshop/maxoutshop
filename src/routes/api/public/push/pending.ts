import { createFileRoute } from "@tanstack/react-router";

/** Called by the service worker after a payload-less push to fetch the text. */
export const Route = createFileRoute("/api/public/push/pending")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const endpoint = new URL(request.url).searchParams.get("e") ?? "";
        if (!endpoint) return new Response("Missing endpoint", { status: 400 });

        const { adminDb } = await import("@/lib/membership.server");
        const db = adminDb();
        const { data: sub } = await db
          .from("push_subscriptions")
          .select("user_id")
          .eq("endpoint", endpoint)
          .maybeSingle();
        if (!sub) return new Response("Not found", { status: 404 });

        const { data: note } = await db
          .from("notifications")
          .select("title, body, url")
          .eq("user_id", sub.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!note) return new Response("Not found", { status: 404 });
        return Response.json(
          { title: note.title, body: note.body, url: note.url ?? "/" },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
