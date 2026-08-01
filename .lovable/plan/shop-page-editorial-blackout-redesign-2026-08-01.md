# Shop page — editorial blackout redesign

Rebuild `/shop` so it matches the home screen's blackout-bento energy instead of the current plain grid + dropdown.

## What changes

**Sticky search + filter header**
- Big Bebas "SHOP" title with live product count under it, collapsing into a compact sticky bar as you scroll.
- Search field becomes a full-width pill with an inline clear button and instant results count.
- Category chips get an animated active pill (black-on-white inversion), horizontal snap scroll, and stay pinned under the sticky bar.

**Editorial product grid**
- Mixed-size bento rhythm instead of a uniform 2-column grid: every 5th product renders as a full-bleed wide tile with an oversized name overlay; the rest stay in the 2-up column.
- Product tiles go grayscale by default and bloom to full color on tap/hover, matching the home rails.
- Price, collection, and badges (NEW / SALE / EARLY) sit on a dark scrim inside the image instead of below it, so the grid reads as a wall of imagery.
- Locked ELITE items keep the blur + lock treatment but gain a gold-tinted border.

**Filter sheet upgrade**
- Adds sort options into the sheet (removes the native `<select>` in the toolbar, replaced with a small sort chip).
- Sizes, max price, plus new toggles: On sale only, New arrivals, In stock.
- Active filter count badge on the filter button, and a row of dismissible active-filter chips above the grid.

**Empty + loading states**
- Skeleton bento tiles while the catalog loads (currently pops in).
- Empty state becomes a centered editorial block with a "Reset everything" action.

## Technical notes

- All work stays in `src/routes/shop.tsx` plus a new `src/components/ProductTile.tsx` for the bento/overlay card variant; existing `ProductCard` stays untouched for other pages.
- Filters (sizes, price, sale, new) remain local state; category/collection/q/sort stay in the URL via the existing `validateSearch`, so links keep working.
- Uses existing semantic tokens only (`background`, `surface`, `border`, `accent`, `foreground`) — no new colors or fonts.
- No backend, catalog, or checkout logic changes.
