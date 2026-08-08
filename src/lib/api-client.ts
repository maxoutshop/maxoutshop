import { IS_NATIVE_BUILD, apiUrl } from "./api-base";
import { supabase } from "@/integrations/supabase/client";
import { getCatalog, createCheckout } from "./wix.functions";
import { parseFood } from "./nutrition.functions";
import type { CatalogProduct } from "./catalog-meta";
import type { ParsedFoodItem } from "./nutrition.types";

async function nativeFetch(path: string, init?: RequestInit & { auth?: boolean }) {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.auth) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, headers });
  } catch (error) {
    // Surface real native connectivity problems instead of hiding them.
    console.error(`[native] ${path} request failed`, error);
    throw new Error(`Can't reach MAXOUT servers (${path}). Check your connection.`);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    console.error(`[native] ${path} responded ${res.status}: ${message}`);
    throw new Error(message);
  }
  return json;
}

/** Live Wix catalog. Native builds go through /api/mobile/catalog. */
export async function fetchCatalogClient(): Promise<CatalogProduct[]> {
  if (!IS_NATIVE_BUILD) return (await getCatalog()) as CatalogProduct[];
  const json = (await nativeFetch("/api/mobile/catalog")) as { products?: CatalogProduct[] };
  return json?.products ?? [];
}

/** Wix checkout handoff URL. */
export async function createCheckoutClient(input: {
  lines: Array<{ productId: string; variantId?: string; quantity: number; options?: Record<string, string> }>;
  email?: string;
}): Promise<{ url: string }> {
  if (!IS_NATIVE_BUILD) return await createCheckout({ data: input });
  return (await nativeFetch("/api/mobile/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  })) as { url: string };
}

/** AI macro estimation from text and/or a photo. */
export async function parseFoodClient(input: {
  text?: string;
  imageDataUrl?: string;
}): Promise<{ items: ParsedFoodItem[]; error?: string }> {
  if (!IS_NATIVE_BUILD) return await parseFood({ data: input });
  return (await nativeFetch("/api/mobile/parse-food", {
    method: "POST",
    body: JSON.stringify(input),
    auth: true,
  })) as { items: ParsedFoodItem[]; error?: string };
}
