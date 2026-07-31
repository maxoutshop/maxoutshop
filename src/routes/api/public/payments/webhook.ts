import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const { upsertSubscription, adminDb, refreshEliteFlag } = await import("@/lib/membership.server");

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await upsertSubscription(event.data.object, env);
      break;

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const db = adminDb();
      const { data: row } = await db
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id)
        .eq("environment", env)
        .select("user_id")
        .maybeSingle();
      if (row?.user_id) await refreshEliteFlag(row.user_id);
      break;
    }

    case "checkout.session.completed": {
      // Subscription state arrives via customer.subscription.created, but this
      // event confirms the userId ↔ customer link even for delayed payments.
      const session = event.data.object;
      if (session.payment_status !== "unpaid" && session.metadata?.userId && session.subscription) {
        const db = adminDb();
        await db
          .from("subscriptions")
          .update({ user_id: session.metadata.userId })
          .eq("stripe_subscription_id", session.subscription)
          .eq("environment", env);
        await refreshEliteFlag(session.metadata.userId);
      }
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      // Status itself is carried by customer.subscription.updated; recompute
      // the member's access flag so a failed renewal locks ELITE immediately.
      const invoice = event.data.object;
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customer) {
        const db = adminDb();
        const { data: row } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customer)
          .limit(1)
          .maybeSingle();
        if (row?.user_id) await refreshEliteFlag(row.user_id);
      }
      break;
    }

    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
