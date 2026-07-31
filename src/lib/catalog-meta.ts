import { PRODUCTS, type Product } from "./products";

export type WixVariant = {
  id: string;
  choices: Record<string, string>;
  inStock: boolean;
  price: number;
};

export type CatalogProduct = Product & {
  id?: string;
  variants?: WixVariant[];
  inStock?: boolean;
};

type Meta = Pick<Product, "category" | "collection" | "bestSeller" | "newArrival" | "earlyAccess">;

export const PRODUCT_META: Record<string, Meta> = Object.fromEntries(
  PRODUCTS.map((p) => [
    p.slug,
    {
      category: p.category,
      collection: p.collection,
      bestSeller: p.bestSeller,
      newArrival: p.newArrival,
      earlyAccess: p.earlyAccess,
    } satisfies Meta,
  ]),
);

export const FALLBACK_CATALOG: CatalogProduct[] = PRODUCTS;

export function guessCategory(name: string): Product["category"] {
  const n = name.toLowerCase();
  if (/bottle|shaker|cap|hat|bag|sock|band|strap|belt/.test(n)) return "accessories";
  if (/legging|sports bra|crop|scrunch/.test(n)) return "women";
  if (/muscle tank|compression/.test(n)) return "men";
  return "unisex";
}

export function guessCollection(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes("america")) return "America Drop";
  if (n.includes("apex")) return "Apex";
  if (n.includes("summer")) return "Summer";
  if (n.includes("core")) return "Core";
  return undefined;
}

const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a",
  "vintage black": "#1f1f1f",
  white: "#f5f5f5",
  cream: "#efe7d8",
  bone: "#e6e0d4",
  sand: "#d8c9ae",
  beige: "#d6c7b0",
  khaki: "#b8a888",
  olive: "#4b5320",
  army: "#4b5320",
  green: "#2f5d3a",
  navy: "#111827",
  blue: "#2b4b8c",
  "light blue": "#8fb3d9",
  gray: "#8a8a8a",
  grey: "#8a8a8a",
  charcoal: "#3a3a3a",
  "gray purple": "#7c7189",
  purple: "#6b4d8c",
  pink: "#d9a3b4",
  red: "#8c2f2f",
  maroon: "#5c1f28",
  burgundy: "#5c1f28",
  orange: "#c56a2c",
  yellow: "#d9bb54",
  brown: "#5b432f",
  taupe: "#8d8177",
};

export function colorHex(name: string): string {
  const n = name.toLowerCase().trim();
  if (COLOR_MAP[n]) return COLOR_MAP[n];
  const hit = Object.keys(COLOR_MAP)
    .sort((a, b) => b.length - a.length)
    .find((k) => n.includes(k));
  return hit ? COLOR_MAP[hit]! : "#6b6b6b";
}
