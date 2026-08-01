import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PRODUCT_META,
  colorHex,
  guessCategory,
  guessCollection,
  type CatalogProduct,
  type WixVariant,
} from "./catalog-meta";

// Publishable Wix Headless OAuth client id (safe to ship).
export const WIX_CLIENT_ID = "45f1c242-f35d-42c1-bcdc-11bf47989eba";
export const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
export const STORE_URL = "https://www.maxoutshop.com";
export const WIX_SITE_ID = "741b6307-7799-4856-8b19-8a9a516c050e";

export function wixClient() {
  return createClient({
    modules: { products, currentCart, redirects },
    auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }),
  });
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function publishableClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing Supabase publishable credentials for catalog metadata");
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined,
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseDescription(html = "") {
  const blocks = [...html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => ({ tag: m[1], t: plain(m[2] ?? "") }))
    .filter((b) => b.t.length > 0);

  const intro: string[] = [];
  const specs: string[] = [];
  const care: string[] = [];
  let section: "intro" | "specs" | "care" | "other" = "intro";

  for (const b of blocks) {
    const low = b.t.toLowerCase();
    if (b.t.length < 42 && /^(features|material|materials|fabric|care instructions|care|please note|size guide|product measurements|shipping)/.test(low)) {
      section = /^(features|material|materials|fabric)/.test(low)
        ? "specs"
        : /^care/.test(low)
          ? "care"
          : "other";
      continue;
    }
    if (section === "intro") {
      if (b.tag === "p" && !/^maxout\b.{0,4}built for more/i.test(b.t)) intro.push(b.t);
    } else if (section === "specs") {
      specs.push(b.t);
    } else if (section === "care") {
      care.push(b.t);
    }
  }

  return {
    description: intro.join(" ").slice(0, 800) || plain(html).slice(0, 400),
    specs: specs.slice(0, 10),
    care: care.slice(0, 6),
  };
}

function imagesOf(p: Record<string, any>): string[] {
  const items = (p["media"]?.items ?? []) as Array<{ image?: { url?: string } }>;
  const urls = items.map((i) => i.image?.url).filter((u): u is string => !!u);
  const main = p["media"]?.mainMedia?.image?.url as string | undefined;
  const all = main ? [main, ...urls.filter((u) => u !== main)] : urls;
  return all.slice(0, 6);
}

function isNewByDate(date?: string | null): boolean {
  if (!date) return false;
  const drop = new Date(date);
  const now = new Date();
  const diff = (now.getTime() - drop.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -1 && diff <= 14;
}

function normalizeMeta(
  slug: string,
  row?: Database["public"]["Tables"]["product_meta"]["Row"] | null,
) {
  const fallback = PRODUCT_META[slug];
  const category = row ? row.category : (fallback?.category ?? null);
  const collection = row ? row.collection : (fallback?.collection ?? null);
  const bestSeller = row ? row.best_seller : (fallback?.bestSeller ?? false);
  const newArrival = row
    ? row.new_arrival || isNewByDate(row.drop_date)
    : (fallback?.newArrival ?? false);
  const earlyAccess = row ? row.early_access : (fallback?.earlyAccess ?? false);
  const dropDate = row ? row.drop_date : null;
  const hidden = row ? row.hidden : false;
  return { category, collection, bestSeller, newArrival, earlyAccess, dropDate, hidden };
}

function mapProduct(
  p: any,
  row?: Database["public"]["Tables"]["product_meta"]["Row"] | null,
): CatalogProduct {
  const name: string = p.name ?? "";
  const slug: string = p.slug ?? "";
  const meta = normalizeMeta(slug, row);
  const price: number = p.priceData?.price ?? p.price?.price ?? 0;
  const discounted: number = p.priceData?.discountedPrice ?? price;
  const opts: any[] = p.productOptions ?? [];
  const sizeOpt = opts.find((o) => /size/i.test(o.name ?? ""));
  const colorOpt = opts.find((o) => /colou?r/i.test(o.name ?? ""));
  const parsed = parseDescription(p.description ?? "");

  const variants: WixVariant[] = (p.variants ?? []).map((v: any) => ({
    id: v._id as string,
    choices: (v.choices ?? {}) as Record<string, string>,
    inStock: v.stock?.inStock !== false,
    price: v.variant?.priceData?.discountedPrice ?? v.variant?.priceData?.price ?? discounted,
  }));

  return {
    id: p._id as string,
    slug,
    name,
    price,
    salePrice: discounted < price ? discounted : undefined,
    saleTag: discounted < price ? "Sale" : undefined,
    images: imagesOf(p),
    category: (meta.category ?? guessCategory(name)) as CatalogProduct["category"],
    collection: meta.collection ?? guessCollection(name),
    sizes: (sizeOpt?.choices ?? []).map((c: any) => c.description ?? c.value),
    colors: (colorOpt?.choices ?? []).map((c: any) => ({
      name: (c.description ?? c.value) as string,
      hex: colorHex((c.description ?? c.value) as string),
    })),
    description: parsed.description,
    specs: parsed.specs,
    care: parsed.care,
    bestSeller: meta.bestSeller,
    newArrival: meta.newArrival,
    earlyAccess: meta.earlyAccess,
    dropDate: meta.dropDate,
    hidden: meta.hidden,
    inStock: p.stock?.inStock !== false,
    variants,
    sourceUrl: `${STORE_URL}/product-page/${slug}`,
  };
}

export async function fetchCatalog(): Promise<CatalogProduct[]> {
  const client = wixClient();
  const res = await client.products.queryProducts().limit(100).find();

  let metaRows: Database["public"]["Tables"]["product_meta"]["Row"][] = [];
  try {
    const { data } = await publishableClient().from("product_meta").select("*");
    metaRows = data ?? [];
  } catch (err) {
    console.warn("Failed to load product metadata", err);
  }

  const metaMap = new Map(metaRows.map((m) => [m.slug, m]));

  return res.items
    .filter((p: any) => p.visible !== false)
    .map((p: any) => mapProduct(p, metaMap.get(p.slug)))
    .filter((p) => !p.hidden);
}

export async function fetchAdminCatalog(): Promise<CatalogProduct[]> {
  const client = wixClient();
  const res = await client.products.queryProducts().limit(100).find();

  let metaRows: Database["public"]["Tables"]["product_meta"]["Row"][] = [];
  try {
    const { data } = await publishableClient().from("product_meta").select("*");
    metaRows = data ?? [];
  } catch (err) {
    console.warn("Failed to load product metadata", err);
  }

  const metaMap = new Map(metaRows.map((m) => [m.slug, m]));

  return res.items.map((p: any) => mapProduct(p, metaMap.get(p.slug)));
}

export type CheckoutLine = {
  productId: string;
  variantId?: string;
  quantity: number;
  options?: Record<string, string>;
};

export async function createWixCheckoutUrl(lines: CheckoutLine[], buyerEmail?: string): Promise<string> {
  const client = wixClient();

  const lineItems = lines
    .filter((l) => l.productId && l.quantity > 0)
    .map((l) => ({
      quantity: l.quantity,
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: l.productId,
        options: {
          ...(l.variantId ? { variantId: l.variantId } : {}),
          ...(l.options && Object.keys(l.options).length ? { options: l.options } : {}),
        },
      },
    }));

  if (lineItems.length === 0) throw new Error("Cart is empty");

  const added = await client.currentCart.addToCurrentCart({ lineItems });
  if (!added.cart?.lineItems?.length) {
    throw new Error("Wix rejected the cart items");
  }

  if (buyerEmail) {
    try {
      await client.currentCart.updateCurrentCart({
        cartInfo: { buyerInfo: { email: buyerEmail } },
      } as never);
    } catch {
      // buyer email is a convenience for order matching; never block checkout
    }
  }

  const checkout = await client.currentCart.createCheckoutFromCurrentCart({
    channelType: "WEB" as any,
  });

  const { redirectSession } = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId: checkout.checkoutId! },
    callbacks: {
      postFlowUrl: STORE_URL,
      thankYouPageUrl: STORE_URL,
      cartPageUrl: `${STORE_URL}/cart-page`,
    },
  });

  const url = redirectSession?.fullUrl;
  if (!url) throw new Error("Could not create Wix checkout session");
  return url;
}

export type MemberOrder = {
  id: string;
  number: string;
  createdAt: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: string;
  items: Array<{ name: string; quantity: number; image?: string }>;
};

/**
 * Wix eCom orders are account-level data, so they come through the Lovable
 * connector gateway (API-key auth) rather than the visitor OAuth client.
 * Returns `configured: false` until the Wix connection is linked.
 */
export async function fetchOrdersByEmail(
  email: string,
): Promise<{ orders: MemberOrder[]; configured: boolean }> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const connectionApiKey = process.env["WIX_API_KEY"];
  if (!lovableApiKey || !connectionApiKey) return { orders: [], configured: false };

  const res = await fetch("https://connector-gateway.lovable.dev/wix/ecom/v1/orders/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": connectionApiKey,
      "wix-site-id": WIX_SITE_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      search: {
        filter: { "buyerInfo.email": email },
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        cursorPaging: { limit: 25 },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Wix orders request failed [${res.status}]: ${body}`);
    throw new Error(`Could not load orders [${res.status}]`);
  }

  const json = (await res.json()) as { orders?: any[] };
  const orders: MemberOrder[] = (json.orders ?? []).map((o) => ({
    id: String(o.id ?? ""),
    number: String(o.number ?? ""),
    createdAt: o.createdDate ?? null,
    status: String(o.status ?? "").toLowerCase(),
    paymentStatus: String(o.paymentStatus ?? "").toLowerCase(),
    fulfillmentStatus: String(o.fulfillmentStatus ?? "").toLowerCase(),
    total: o.priceSummary?.total?.formattedAmount ?? "",
    items: (o.lineItems ?? []).map((li: any) => ({
      name: li.productName?.original ?? li.productName?.translated ?? "Item",
      quantity: Number(li.quantity ?? 1),
      image: li.image?.url ?? undefined,
    })),
  }));

  return { orders, configured: true };
}
