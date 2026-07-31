# Carry the app cart into maxoutshop.com checkout

Right now "Checkout" just opens the store, so the cart is lost. This wires the app cart directly into your Wix store cart using your Wix Headless client ID (`45f1c242-…`), so tapping checkout drops the shopper into a maxoutshop.com checkout page that already contains their exact items, sizes and quantities.

## How it will work

```text
App cart  →  create Wix cart (line items + variants)  →  Wix checkout URL  →  maxoutshop.com pays
```

1. On checkout, the app sends the cart to a server function.
2. That function authenticates as a Wix visitor with your Headless client ID, creates a cart via the Wix eCommerce API, and generates a checkout URL.
3. The app opens that URL — the shopper sees their real cart on maxoutshop.com and pays there. Orders, inventory and fulfilment stay in Wix.

## Real catalog, real variants

Wix needs real product IDs and variant IDs (size/colour) — the current `products.ts` was scraped from the storefront and has none. So:

- Add a server function that pulls the live catalog from Wix Stores (products, prices, images, options like Size/Colour, variant IDs, stock).
- The Shop, product page, and cards read from that live catalog instead of the hardcoded file, with the current data kept as an offline fallback so the app never renders empty.
- Product pages show real stock status, and out-of-stock sizes get disabled.
- Side benefit: your invented/removed products problem disappears — the app can only ever show what's actually in your Wix store.

## Behaviour details

- Checkout button states: idle → "Creating your checkout…" → opens Wix checkout in a new tab.
- If Wix is unreachable or an item is unavailable, show a clear inline error and the per-item fallback links (no silent failure, no fake order).
- Promo code: hand it through to Wix rather than pretending to apply it in-app; the app-side promo field becomes a note that codes are applied at checkout (or is removed if you prefer).
- The rewards-points checkbox in the cart is demo-only today; it will be labelled as coming with the rewards backend so it isn't mistaken for a real discount.

## Technical notes

- Connect the Wix connector so credentials are stored securely; the Headless client ID is used for visitor-token auth, and any secret key stays server-side only. Nothing sensitive ships to the browser.
- New `src/lib/wix.functions.ts` server functions: `getCatalog`, `createCheckout({ items })`.
- Wix APIs used: Stores catalog query (products + variants), eCommerce carts create, and checkout creation from cart.
- Product identity switches from hand-written slugs to Wix product IDs, with slugs kept for pretty URLs.
- Catalog responses cached briefly so browsing stays fast.

## Order of work

1. Connect Wix and verify the store + catalog come back through the connector.
2. Live catalog powering shop / product pages, with fallback.
3. Cart → Wix cart → checkout URL handoff, with proper loading and error states.

Approve and I'll start with step 1 — I'll need you to confirm the Wix connection when the connect card appears.
