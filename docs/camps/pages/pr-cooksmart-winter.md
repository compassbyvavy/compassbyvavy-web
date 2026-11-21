## Summary

- Adds a COOKSMART-only Format C winter camp page (`/camps/cooksmart-winter` and preview) matching `docs/camps/pages/reference/cooksmart-winter.html`, without changing the shared camp template (`CampListingPage` / `view.ts`).
- Fills the batch-1 COOKSMART listing so admin review and the review pack show real facts.
- Narrow redirect exemptions only for `/camps/cooksmart-winter` and `/camps/preview/cooksmart-winter`.
- On `/ontario/camps/winter-break` and `/mississauga/camps/winter-break`, shows a request-time “Checked so far” card when COOKSMART is approved and published in `/admin/camps/review`.

## Preview

`/camps/preview/cooksmart-winter?t=QqC_uGjDCRjS48QRoU0uwqtJH-_chsd0`

Phone screenshots (375px): `docs/camps/pages/reference/cooksmart-winter-screenshots/`

- `cooksmart-01-top.png` … `cooksmart-07-parents-say.png` — camp page
- `winter-break-without-approval.png` / `winter-break-with-approval.png` — subcategory card (dev)
- `worker-preview-cooksmart-winter.png` / `worker-preview-winter-break.png` — same pages from `npm run preview` (Cloudflare Worker runtime on `:8787`)

## How request-time approval works with `generateStaticParams`

`app/[city]/[category]/[subcategory]/page.tsx` still has `generateStaticParams` for ontario paths. Only when the path is camps + winter-break + (`ontario` | `mississauga`) does the page call `connection()` from `next/server`, then `isCampLive(readReviewState(), "cooksmart-winter")`. Other subcategory paths never call `connection()`, so they stay statically generated. Winter-break for those two cities is rendered per request so approval is not frozen at build.

## Bundled `review-state.json` (Cloudflare Worker)

`lib/camps/pages/store.ts` statically imports `data/camps/pages/review-state.json` (same pattern as `discover.json`) so OpenNext includes it in the Worker bundle. Local `writeReviewState` still writes the file on disk for approve → commit, and keeps an in-memory copy so local admin approvals show without a restart. On the Worker, `readFileSync` may fail; the import is the source of truth.

This branch leaves `review-state.json` empty (no approvals committed). To go live: approve + publish COOKSMART locally, commit the file, deploy.

## Per-camp publish date

- Each decision can store its own `publishedOn`. The old batch-wide `publishedOn` is still read so existing files keep working.
- `isCampLive(slug)` = approved **and** that camp has a publish date (per-camp or legacy batch-wide).
- Publish batch publishes only approved camps that are not live yet, and can run again later. It refuses only when there is nothing new to publish.
- A camp’s preview token expires when **that** camp is published (or after the 30-day token limit). Other unpublished camps in the batch keep working previews.

## City slugs

- `ontario` — special “All of Ontario” location from taxonomy (`ONTARIO`), not a row in `discover.json` cities.
- `mississauga` — city slug in `data/taxonomy/discover.json` (among ~347 cities).
- Card is not shown for other cities (e.g. `toronto`).

## Changed files

- `app/camps/[slug]/page.tsx`
- `app/camps/preview/[slug]/page.tsx`
- `app/camps/cooksmart-winter.css`
- `app/[city]/[category]/[subcategory]/page.tsx`
- `app/admin/camps/review/page.tsx` (re-publishable batch; live-since line)
- `components/camps/pages/CookSmartWinterPage.tsx`
- `components/shell/DiscoverViews.tsx`
- `app/shell.css` (Checked so far spacing only)
- `lib/camps/pages/cooksmartWinter.ts`
- `lib/camps/pages/cooksmartWinter.test.ts`
- `lib/camps/pages/cooksmartCheckedSoFar.test.ts`
- `lib/camps/pages/review.ts` / `store.ts` / `preview.ts` / `pack.ts`
- `lib/camps/pages/reviewStore.test.ts`
- `lib/camps/pages/pages.test.ts`
- `lib/camps/pages/batch1.ts` (COOKSMART entry only)
- `lib/shell/redirects.ts`
- `lib/shell/redirects.test.ts`
- `lib/voice/copy.ts`
- `docs/camps/pages/reference/cooksmart-winter.html`
- `docs/camps/pages/reference/cooksmart-winter-screenshots/*`
- `docs/camps/pages/pr-cooksmart-winter.md`

## Not changed

- `components/camps/pages/CampListingPage.tsx`
- `lib/camps/pages/view.ts`
- KSG / Longo's / CKP listings
- `supabase/`, SQL, deploys, merge

## vs the reference HTML

- Omits FORMAT C strip, orange draft banner, and Review notes box.
- Sticky bar matches the HTML (no Save).
- Site chrome (header/footer) wraps the page; the reference was a standalone draft.
- Booking list is date-ordered (Dec 21 → Dec 22 → Dec 30).
- Provider line and card drop "Clarkson" (Vineeta, Nov 21).

## Next.js “2 Issues” on screenshots

1. **React hydration mismatch** — Cursor’s browser tooling injects `data-cursor-ref` attributes into the DOM before hydrate (visible in the stack on footer/`SiteChrome` links). Not from the COOKSMART page or routing change; not fixed here.
2. **Middleware convention warning** — Next.js 16 deprecates `middleware.ts` in favour of `proxy`. Pre-existing; unrelated to COOKSMART.

## Test plan

- [ ] Open COOKSMART preview; confirm layout vs reference (no review banners).
- [ ] Empty bar → “Pick a day” → `#sessions`; one half day → booking URL + HST; three days → booking list in date order.
- [ ] Approve + publish COOKSMART in `/admin/camps/review`; confirm `/camps/cooksmart-winter` and winter-break card appear for ontario/mississauga only.
- [ ] Without approval, winter-break page has no “Checked so far” section.
- [ ] Approve + publish COOKSMART only → KSG preview still opens; publish KSG later without changing COOKSMART’s date.
- [ ] `npm run preview` with COOKSMART approved+published in the committed JSON → live page + winter-break card (Worker).
- [ ] KSG / Longo's / CKP pages unchanged.
