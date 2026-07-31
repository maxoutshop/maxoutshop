# Home screen redesign — Editorial Blackout Bento

A full rebuild of the home screen in the direction you picked: pure blackout palette, Bebas Neue display type, and a bento grid of hairline-bordered tiles. Real data stays wired to your live Wix catalog and your logged-in stats.

## Look and feel

- Palette locked to blackout + steel: true black page, `#111` tiles, `#2a2a2a` hairline borders, white `#f5f5f5` as the only accent. The current warm amber accent is removed from the home screen.
- Typography: Bebas Neue for all display headings (huge, tight, uppercase), Barlow for body, labels, and tiny tracked-out caps.
- Sharp, squared tiles instead of the current soft rounded cards — thin 1px borders doing the structural work.
- Motion: tiles fade/settle in on scroll, stat numerals count up, hairline borders brighten on press. No bounce.

## Sections, in order

1. **Header bar** — MAXOUT wordmark in Bebas, cart count and avatar as outlined squares.
2. **Hero drop tile** — 4:5 full-bleed drop image, gradient scrim, "LATEST RELEASE" kicker, huge stacked Bebas headline, solid white "SHOP COLLECTION" button. Pulls the newest collection from the live catalog.
3. **Stats bento** — 2-column grid: large square streak tile with an oversized numeral, plus a stacked pair (protein progress with hairline bar, top PR). Uses your real tracked data when signed in; demo values when signed out.
4. **Live challenge strip** — inverted white-on-black block with live dot, challenge name, and participant count. High-contrast punch in the middle of the scroll.
5. **Category row** — Men / Women / Accessories as three bordered tiles linking into Shop.
6. **Best sellers rail** — horizontal snap scroll, 3:4 grayscale-on-idle product tiles, tracked-caps name and price.
7. **Latest drop grid** — 2-up bento of the newest tagged products (only shown when drops exist).
8. **Early access / signup tile** — centered "UNLOCKED ACCESS" block with an underline-style email input and JOIN action.

Bottom navigation stays exactly as it is today (Home, Shop, Track, Community, Profile) — only its type and icon treatment are tightened to match.

## Technical notes

- Add Bebas Neue + Barlow via `<link>` tags in `src/routes/__root.tsx` head, then register `--font-display` / `--font-sans` in the `@theme` block of `src/styles.css`.
- Add blackout tokens (`--surface`, `--border`, tile background) as semantic CSS variables in `src/styles.css` so no hardcoded hex lands in components. Values copied verbatim from the chosen direction.
- Rewrite `src/routes/index.tsx` around the new bento composition; extract repeated tile chrome into small local components (`Tile`, `StatTile`, `SectionHead`).
- Keep all existing data hooks (`useCatalog`, best-seller/new-arrival filtering, drop sorting) and all existing links unchanged.
- Route `head()` metadata stays as-is.
- Because the display font and tokens are global, other screens will inherit the new type — I'll spot-check Shop, Track, Community, and Profile for spacing regressions and fix any that break.

## Out of scope

No changes to cart, checkout, product pages, or backend logic.
