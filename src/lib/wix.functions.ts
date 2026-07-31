import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchCatalog } = await import("./wix.server");
  return await fetchCatalog();
});

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      lines: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        options?: Record<string, string>;
      }>;
      email?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { createWixCheckoutUrl } = await import("./wix.server");
    const url = await createWixCheckoutUrl(data.lines, data.email);
    return { url };
  });

/** Order history for the signed-in member, matched on the email used at checkout. */
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    if (!user?.email) return { orders: [], configured: true };
    const { fetchOrdersByEmail } = await import("./wix.server");
    return await fetchOrdersByEmail(user.email);
  });

export const getAdminCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { fetchAdminCatalog } = await import("./wix.server");
    return await fetchAdminCatalog();
  });

export const saveProductMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      slug: string;
      category?: string;
      collection?: string;
      bestSeller?: boolean;
      newArrival?: boolean;
      earlyAccess?: boolean;
      hidden?: boolean;
      dropDate?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase.from("product_meta").upsert({
      slug: data.slug,
      category: data.category ?? null,
      collection: data.collection ?? null,
      best_seller: data.bestSeller ?? false,
      new_arrival: data.newArrival ?? false,
      early_access: data.earlyAccess ?? false,
      hidden: data.hidden ?? false,
      drop_date: data.dropDate ?? null,
    });

    if (error) throw error;
    return { ok: true };
  });
