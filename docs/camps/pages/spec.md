# Camp pages, preview and review pack: build spec

Nov 16, 2026 · Vineeta Agarwal
Keep at `docs/camps/pages/spec.md`. Reference designs go in `docs/camps/pages/reference/`.

## What it is

Cursor builds every camp page as code from Supabase data. Pages are reviewed in batches of about 10 before they go live:

1. The site renders each camp on a **private preview link**.
2. A script writes a **review pack** for the batch.
3. Vineeta and Claude review the batch. Claude gets the pack and the preview links in a fresh chat and returns Approve / Fix / Decline per camp.
4. Vineeta makes the final call in **/admin/camps/review**. Approved camps go live together (Decision #27: batches of about 10).

No AI or LLM calls anywhere in this feature. Decision #36: Claude decides and reviews, Cursor builds.

## Reference designs

Three hand-built drafts show the target layout, tone and level of detail. Match them; don't copy their hard-coded data.

| File | Shows how to handle |
| --- | --- |
| `reference/ksg-winter.html` | Pick individual days and full or half day per day, before/after care, a dated deal line, registration not open yet |
| `reference/longos-winter.html` | 8 single-day camps with different themes, no care, lunch included, spots per day |
| `reference/creative-kids-place-march-break.html` | One camp at several locations with different prices, full week or 2- or 3-day options, care priced per week or per day, special days |

## The camp page

Route `/camps/[slug]`. Phone-first. Sections in this order (the parent-first spec: answers first):

1. Breadcrumb (Discover › Camps › {break}), the camp name as H1, and a provider line (organisation · location or "N locations").
2. **Summary line**: the camp's own answer to "What makes your camp different" from the listing form, as edited by Vineeta. If there is none, hide the box. Never generate it.
3. **Facts grid**, always these 6: Ages · Dates · Price · Hours · Before & after care · Lunch. A missing value shows "Ask the camp" in grey; never leave a blank or guess.
4. **Status box**: registration state (Opens {date} / Open / Full / Closed) plus spots with their check date ("17–20 spots left · checked Nov 15"). Never "live".
5. Section pills, then **Sessions** (the picker, by type: single days, full or half day, locations × days × care, or weekly), **The week** (if special days exist), **Before you go**, **Changes & refunds**, **How we checked** (each source link with its check date).
6. Sticky bottom bar: selection summary and total, **Save**, **Register** (goes to the session's own register link).
7. A "Confirmed by the camp, {date}" badge when an approved listing-form submission exists.

Rules:

- Every fact on the page carries its source and check date in the data, even if only "How we checked" shows them.
- A fact last checked before Sep 1, 2026 shows a "(2025–26)" tag until it is re-confirmed (Decision #13).
- A time-limited deal is a dated line under the price and disappears automatically after its end date (Decision #33).
- Full sessions stay visible, marked Full (Decision #16).

## Preview link

- Route `/camps/preview/[slug]?t=[token]`: renders the page exactly as it would go live, with a "Preview: not published" banner at the top.
- One random token per batch (at least 32 characters). No login, so Claude can open the link in a review chat. `noindex`, and not linked from anywhere.
- The token expires when the batch is approved, or after 30 days.
- Before the PR is merged, the links only work if the repo has preview deployments for branches. If it doesn't, the review pack alone is enough for the review.

## Review pack

`npm run review-pack -- --batch <n>` writes `docs/camps/review/batch-<nn>.md`. For each camp in the batch:

- the preview link
- a table of every fact shown on the page: field, value, source URL, check date
- **Flags** from the rules below, or "No flags"

Flag rules (code only):

1. A key field is missing: dates, price, hours, ages, register link.
2. A fact was last checked before Sep 1, 2026.
3. The same field differs between locations of one camp.
4. A price is more than 2× or less than half the median for the same break.
5. Care pricing says "per day" in one place and "per week" in another.
6. A Camp Watcher change for this camp is still pending.
7. A source has been unreachable 2 nights in a row.
8. The register link doesn't return HTTP 200 (the script checks it).

At the end of the file, list a summary line per camp: name, number of flags, and the preview link.

## Admin review screen

`/admin/camps/review` (admin only):

- Pick a batch. Each camp shows its preview, its flags, and three buttons: **Approve**, **Fix** (with a note), **Decline** (with a reason).
- **Publish batch** puts every approved camp live at once. Fix and Decline stay unpublished and carry over to the next batch.
- Approving writes the approval date into the data, for the "How we checked" section.

## Batches

Batch 1 (10 camps; most have booking feeds, so the data is strongest): KSG Gymnastics (winter), Longo's Loft Applewood (winter), Creative Kids Place (March Break), Gymnastics Mississauga (winter), Futures Gymnastics (winter and March Break), COOKSMART (winter), Visual Arts Mississauga (winter), City of Mississauga (winter), Exploring Minds (winter), Newton's Grove (March Break).

Later batches: the rest of the Camp intake rows, about 10 at a time, in the order Vineeta picks in the admin screen.

## Instructions for Cursor

Build the camp page template, preview link, review pack script and admin review screen in compassbyvavy-web from this spec, matching the three files in `docs/camps/pages/reference/`.

1. A camp page template at `/camps/[slug]` rendering from existing Supabase camp data, with the sections and rules above. Reuse existing components and styles where they exist.
2. The preview route with a per-batch token, banner, noindex and expiry.
3. A `review-pack` script with the 8 flag rules, writing `docs/camps/review/batch-<nn>.md`.
4. An `/admin/camps/review` screen with Approve / Fix / Decline and Publish batch.
5. Tests: a missing field shows "Ask the camp"; an expired deal line disappears; a fact checked before Sep 1, 2026 gets the "(2025–26)" tag; each flag rule fires on a fixture; an expired or wrong token can't open a preview.
6. Generate batch 1 previews and its review pack on the branch, so Vineeta can start the review.

Rules: work on a branch, open a PR, send phone-sized screenshots of KSG, Longo's and Creative Kids Place pages next to the reference files. No commits to main, no deploys, no SQL against production, nothing published. No AI or LLM calls.
