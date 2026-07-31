# Auto-sync new drops from Wix with manual tagging

Right now the app already reads your live Wix catalog, so any product you publish on maxoutshop.com shows up in the app automatically. The missing piece is control over which products are flagged as new drops, best sellers, collections, etc. This plan fixes that with a simple product metadata table and an admin view.

## How it will work

```text
Add product on Wix → App fetches it automatically (within minutes)
You tag it in the app admin → Home/Shop show New Drop / Best Seller / Collection badges
```

- Wix stays the source of truth for names, images, prices, variants, and stock.
- The app adds a lightweight metadata layer on top so you can tag, categorize, and hide products without touching Wix.

## What we will build

1. **Database: product metadata table**
   - Create `public.product_meta` keyed by the Wix product slug.
   - Columns: `slug`, `category`, `collection`, `best_seller`, `new_arrival`, `early_access`, `hidden`, `drop_date`.
   - RLS: admins can edit; signed-in users can read.

2. **Merge Wix data with metadata**
   - Update `src/lib/wix.server.ts` so `fetchCatalog` fetches the Wix product list, then merges in `product_meta` overrides.
   - If a product has no metadata, keep the current guessing functions as a fallback.
   - A product marked `hidden` will not appear in the app, even if it is visible on Wix.

3. **New-drop badges and home section**
   - Automatically badge products where `new_arrival` is true or `drop_date` is within the last 14 days.
   - Add a "Latest Drop" section to the home screen that highlights the newest tagged products.

4. **Admin product manager**
   - Add a new admin-only route `/admin/products` that lists the live Wix catalog.
   - Each row lets you set category, collection, best seller, new arrival, early access, hidden, and drop date.
   - Save writes directly to `product_meta`; changes take effect on the next catalog refresh.

## Technical notes

- Keep the existing Wix Headless SDK (`src/lib/wix.server.ts`) and client ID for catalog and checkout.
- Use `requireSupabaseAuth` and the `has_role()` helper for admin-only mutations.
- Maintain the bundled fallback catalog so the shop never renders empty.
- New Wix products need no manual work to appear in the app; tagging is only needed if you want curated badges.

## Order of work

1. Add `product_meta` table and RLS policies via migration.
2. Merge `product_meta` into `fetchCatalog` and honor the `hidden` flag.
3. Add New Drop badges and a Latest Drop section on the home screen.
4. Build the `/admin/products` tagging page.
