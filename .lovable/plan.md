MAXOUT is a very large app (ecommerce + fitness + nutrition + community + challenges + rewards + ambassador + admin + backend). Trying to ship everything in one pass would leave every surface half-built. Here's how I'd like to build it in phases so each layer is real and polished.

## Design foundation (always first)
- Dark, near-black premium design system in `src/styles.css` (oklch tokens, editorial typography pairing, rounded cards, subtle motion).
- Mobile-first shell with fixed bottom nav (Home, Shop, Track, Community, Profile) and a top bar with logo + cart icon.
- Responsive desktop layout that keeps the same aesthetic.

## Phase 1 — Shoppable brand app (frontend, demo/local state)
- Home: hero (America Drop), collection tiles (Men / Women / Accessories), best sellers, new arrivals, teaser cards for Track / Community / Rewards.
- Shop: product grid, category filters, size/color/price filters, search, sort, wishlist, recently viewed.
- Product page: gallery, size/color selectors (Add to Cart disabled until selected), description, specs, care, shipping, related.
- Cart: full cart UI with quantity, subtotal, promo field, "Checkout on maxoutshop.com" handoff (no fake purchases).
- Product data: structured `products.ts` seeded from maxoutshop.com (real names, images, prices, categories). Easy to extend later.

## Phase 2 — Backend + accounts (Lovable Cloud)
- Enable Lovable Cloud, add email/password + Google auth.
- Schemas: profiles, products, variants, cart_items, wishlists, orders (stub), workouts, exercises, sets, PRs, meals, foods, nutrition_logs, water_logs, posts, comments, likes, follows, challenges, participations, points, transactions, notifications, early_access, ambassadors, referrals, reports. RLS on every user-owned table.
- `user_roles` table + `has_role()` for admin/ambassador gating.

## Phase 3 — Fitness (Track tab)
- Dashboard (streak, weekly workouts, PRs, macros, challenge progress, weight goal).
- Workout tracker (categories, exercises, sets/reps/weight, templates, rest timer, history + charts).
- PR tracker with animated celebration + shareable card.
- Progress: weight, measurements, private progress photos with date compare.

## Phase 4 — Nutrition
- Fast meal logging (breakfast/lunch/dinner/snack/water), macro rings, custom foods, favorites, one-tap re-log, photo upload, dietary prefs. Barcode placeholder clearly labeled.

## Phase 5 — Community + Challenges + Rewards
- Feed (posts, likes, comments, follow, save, report/block, moderation).
- Challenges (individual + team, progress, leaderboard, badges).
- Rewards points ledger, tiers (Member/Athlete/Elite/MAXOUT), redemption UI (real discounts labeled as requiring ecommerce integration).

## Phase 6 — Early Access, Notifications, Ambassador, Admin
- Early Access locked screen + gated drops.
- In-app notification center + per-category preferences (push labeled as requiring native integration).
- Ambassador dashboard (role-gated).
- Admin dashboard (role-gated): products, drops, challenges, notifications, reports, analytics.

## Honesty guardrails
- No fake purchases — checkout hands off to maxoutshop.com.
- Barcode scanner, push notifications, real payments, and payout processing will be clearly labeled as requiring external integration until those are wired.
- Real MAXOUT product data only; no invented copy or renamed products.

## What I'll ship this turn
Phase 1 in full: design system, bottom nav shell, home, shop with filters, product page, cart with maxoutshop.com handoff, plus placeholder screens for Track / Community / Profile that preview what's coming. This gives you a real, premium, browsable app immediately, and a clean base for the backend + fitness phases.

Approve this and I'll start on Phase 1 right away. If you'd rather reorder (e.g. do backend + accounts before shop polish), tell me and I'll adjust.
