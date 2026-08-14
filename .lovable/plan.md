# MAXOUT Platform Upgrade — Phased Build

Ten new systems on top of the existing app. Nothing existing gets rebuilt: the Wix catalog, checkout, ELITE/Stripe, native transport, workout logging, feed, DMs and admin console all stay exactly as they are and get extended.

Everything ships against the proven native pattern: anything the iPhone must call server-side goes through `/api/public/mobile/*` with the bearer-token CORS helper already used by parse-food. No new `createServerFn` cross-origin calls from native.

## Phase 1 — Data foundation (one migration)

All new tables at once so later phases never block on approvals:

- `workout_templates`, `workout_template_exercises` — personal templates
- `saved_meals`, `saved_meal_items` — saved meals/recipes
- `wishlist_items`, `recently_viewed`, `shop_preferences`, `stock_watches` — account-synced shop
- `rewards`, `reward_redemptions` — rewards catalog
- `points_ledger` gains `event_key` + unique index — idempotent point awards
- `challenges` gains `metric`, `target_value`; `challenge_participants` gains `completed_at`, `reward_claimed_at`
- `personal_records` gains `source` + unique key per (user, exercise, kind) — idempotent auto-PRs
- `notifications` gains dedupe key + triggers for likes/comments/follows/DMs/hype
- Indexes on user_id, workout dates, exercise, notification read state
- RLS on every table: owner-only for private data, public read only where the feature is intentionally public (leaderboards, rewards catalog)
- Server-side RPCs for anything touching balances: `award_points(event_key)`, `redeem_reward()`, `claim_challenge_reward()` — all idempotent, balance verified in SQL

## Phase 2 — Workout intelligence

- Previous-performance lookup inside `WorkoutSession` (last session per exercise, excluding the live workout), with prefill and a light progression hint
- Automatic PR detection on finish: heaviest weight and best Epley 1RM, written through the idempotent PR path; manual PR logging stays
- Workout Complete screen: duration saved to `duration_min`, stats, new PRs, volume comparison vs the last comparable session, and Done / View Progress / Share to The Floor (prefilled, never auto-posted)
- Personal templates UI: create, edit, duplicate, reorder, delete, plus "Repeat last workout" — all feeding the existing `WorkoutSession`

## Phase 3 — `/progress` analytics hub

Overview, Strength/exercise history, Volume, Calendar heatmap, Muscle-group distribution, with 30d/90d/6m/1y/all ranges. Dedicated date-bounded and aggregated queries in a new `analytics` module — Track, Home and Profile keep their current small fast queries untouched. Charts use the recharts already in the project. Estimated 1RM is labeled as an estimate everywhere.

## Phase 4 — Challenges 2.0 + MAXOUT Rewards

Structured challenge metrics computed from real activity (workout count, sets, volume, streak, PR count, bodyweight logging), progress bars, leaderboards with rank, one-time completion + one-time reward via the Phase 1 RPC. `/rewards` page with balance, lifetime earned, ledger history, earn rules and redeemable catalog. Redemptions are server-verified claims administered from the admin console — no fake Wix coupons. Admin console gains challenge-metric config, rewards catalog CRUD and redemption review.

## Phase 5 — Nutrition + Coach

Saved meals and favorites in the log sheet, one-tap logging, and Copy Yesterday (one meal or all, always creating new rows). AI text/photo logging is untouched. `MAXOUT COACH`: ELITE-only, enforced server-side, conversational UI with quick prompts, answering from a server-built context of only the signed-in user's own workouts, PRs, bodyweight and nutrition. Native path via `/api/public/mobile/coach`. Existing TrainerSheet stays as the nutrition calculator.

## Phase 6 — Shop sync + Notification center

Account-synced wishlist, recently viewed and preferred sizes, with a one-time local→account merge on sign-in that never erases either side. `/wishlist` page rendering live Wix products with graceful unavailable states. Back-in-stock watches with UI + records; I will wire the scheduled checker to the existing cron path used by nutrition reminders and tell you plainly if it can't run reliably. `/notifications` center with bell + unread badge in the app shell, mark read / mark all read, and deep links.

## Testing

Each phase ends with real flow testing in a headless browser against the running app (not just a compile), plus regression passes on catalog, gallery, cart, checkout, food logging, workout delete, feed, DMs and ELITE. Final phase runs `build:web`, `build:mobile` and `cap sync ios`, and I report the exact output.

## What I need from you

Approve and I start at Phase 1 immediately and work down the list. Tell me if you want a different order — for example Progress + Workout Complete first and Rewards later.
