import { useSyncExternalStore } from "react";

type CartItem = {
  slug: string;
  size: string;
  color: string;
  qty: number;
  productId?: string;
  variantId?: string;
};


type State = {
  cart: CartItem[];
  wishlist: string[];
  recentlyViewed: string[];
};

const KEY = "maxout:state:v1";

function load(): State {
  if (typeof window === "undefined") return { cart: [], wishlist: [], recentlyViewed: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  return { cart: [], wishlist: [], recentlyViewed: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: State = { cart: [], wishlist: [], recentlyViewed: [] };

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(EMPTY));
}


export const cartActions = {
  add(item: CartItem) {
    const cart = [...state.cart];
    const i = cart.findIndex((c) => c.slug === item.slug && c.size === item.size && c.color === item.color);
    if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + item.qty };
    else cart.push(item);
    set({ ...state, cart });
  },
  update(i: number, qty: number) {
    const cart = state.cart.map((c, idx) => (idx === i ? { ...c, qty: Math.max(1, qty) } : c));
    set({ ...state, cart });
  },
  remove(i: number) {
    set({ ...state, cart: state.cart.filter((_, idx) => idx !== i) });
  },
  clear() {
    set({ ...state, cart: [] });
  },
};

export const wishlistActions = {
  toggle(slug: string) {
    const has = state.wishlist.includes(slug);
    set({ ...state, wishlist: has ? state.wishlist.filter((s) => s !== slug) : [...state.wishlist, slug] });
  },
};

export const recentActions = {
  push(slug: string) {
    const list = [slug, ...state.recentlyViewed.filter((s) => s !== slug)].slice(0, 8);
    set({ ...state, recentlyViewed: list });
  },
};

export type { CartItem };
