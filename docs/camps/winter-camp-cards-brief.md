# Brief: winter camp cards, live by Jan 1

Written Nov 11, 2026 for whoever builds it (Cursor or Claude). Read it whole before starting.
Related: `compass-camps-page-spec.md` (the camps spec), the Docs spec "Compass camp pages: the
parent-first spec" (Phase 1), and the Sheet "Mississauga camps checklist" (the camp list).

## The goal

Parents in Mississauga can open compassbyvavy.ca/camps and see a card for **every winter-break camp
that is confirmed running this December**, with dates, ages, hours, price and a link to register.
The list grows as the checklist confirms more camps. A camp with no confirmed facts gets no card.

## What already exists (reuse it, don't rebuild it)

- `components/camps/CampCard.tsx`: the card. It already shows provider, program, venue, category
  pills, Dates, Hours (with care note), Ages, price, registration status chip, evidence line, a save
  heart and a "View dates & details" button. It already has honest states for unknowns: "Venue to
  confirm", "Hours to confirm", "Ages to confirm", "Upcoming dates not yet verified",
  "Check with provider".
- `lib/camps/campCardSummary.ts` and `lib/camps/registrationAction.ts`: the logic behind the card.
- `data/camps/types.ts`: `Provider`, `Venue`, `CampProgram`, `CampSession`.
- `lib/camps/catalog.ts`: **in production it returns an empty catalog.** Nothing is read from the
  database yet. This is the main gap.
- The production database already has the tables `providers`, `venues`, `camp_programs`,
  `camp_sessions` (with `publication_state`) and `camp_research_candidates`.

## What to build

### 1. A production data path (the main piece of work)

- In production, `loadCampsCatalog` reads published rows from Supabase: `providers`, `venues`,
  `camp_programs`, `camp_sessions` where `publication_state = 'published'`. Use the anon key and the
  existing `SUPABASE_URL` / `SUPABASE_ANON_KEY` settings, server-side only, the same way
  `lib/discover/venuesSupabase.ts` does for venues.
- Check the read policies: the public (anon) may read only published rows. Write a test that a draft
  row is invisible.
- If the query fails, the page shows the existing "couldn't load" state, never an empty "no camps".
- Non-production and previews keep working as now.

### 2. Card changes (small)

- **Season line.** When the page is filtered to winter (or by default this season), the Dates line
  reads like "Winter: Dec 21–23 · Dec 28–30".
- **Spots carry a date.** Any openings or "Full" shown on a card reads with its check date:
  "Full · checked Nov 10", "8 spots · checked Nov 10". Never shown as live.
- **Who it's for.** A camp limited to existing members shows that line under the title
  (e.g. PLASP: "Only for families already in PLASP").
- **Register link** goes to the exact session or the camp's own winter page, never a home page.
- Cards sort by first date, then name. A filter for age and for area already exists; keep it.

### 3. Seed files for the first camps (draft, then publish)

Same pattern as `supabase/seeds/discover/`: one `.sql` per provider that loads it as **draft**, and
a separate `.publish.sql`. Vineeta runs them herself in the Supabase SQL Editor. Nothing is published
by the builder.

## The first camps (checked Nov 11, 2026 against each camp's own site)

| Camp | Winter 2026 dates | Ages | Hours | Price | Where | Source |
| --- | --- | --- | --- | --- | --- | --- |
| City of Mississauga, Winter Fun / Winter Fun Jr | Dec 21–23 (Mon–Wed) and Dec 29–31 (Tue–Thu), 30 sessions at 9 community centres | 6–12 / 4–5 | From ActiveNet (to add) | From ActiveNet (to add) | Burnhamthorpe, Carmen Corbasson, Churchill Meadows, Frank McKechnie, Huron Park, Malton, Meadowvale, Mississauga Valley, River Grove | `winter-ids.json` (Cursor), after the four fixes listed below |
| COOKSMART | Dec 21–23 and Dec 28–30 | 5–12 | Full or half day | Full day $98, half day $67 | 1700 Mazo Cres | https://www.cooksmart.ca/programs/camps-hub/winter-camp |
| Futures Gymnastics | Dec 21–23 and Dec 28–30 | 5+ | 8:30–4:00 | $225 + HST per session | 6991 Millcreek Dr | https://futuresgymnastics.com/pages/upcoming-camps.html |
| Magnitude Kids Centre | Dec 21–23 (Dec 29–31 listed, year not shown: confirm) | Not stated: confirm | Opens 8:00, close not stated | From $210 (unit not stated: confirm) | 6820 Kitimat Rd, Units 5 & 6 | https://www.magnitudewell.ca/holiday |
| YMCA of Greater Toronto | Dec 21–24 and Dec 29–31 | 6–12 | From the YMCA page | $375 (Dec 21–24), $290 (Dec 29–31) | Mississauga YMCA, 325 Burnhamthorpe Rd W | https://www.ymcagta.org/camps-and-outdoor-education/winter-and-march-break-day-camp |
| PLASP | Dec 21 and Dec 29–31 | Kindergarten and school-age | From the PLASP page | K $22/day, school-age $26.93/day | Peel sites | https://www.plasp.com/programs-fees/winter-spring-break-pa-day-program/winter-break-programs-peel/ — **current PLASP families only** |
| Gymnastics Mississauga | Not posted yet ("Holiday Gym Camps 2026–2027") | From the page | 9:00–4:30 | $80/day | From the page | https://gymmississauga.org/winter-camps/ — card shows "Upcoming dates not yet verified" until dates are posted |

Rules for this table: re-open each source before seeding and use what it says that day. Anything
marked "confirm" or "to add" stays out of the card (the card's own "to confirm" state shows) until
it's confirmed. Record `source_url` and `source_checked_date` on every row.

**City Winter Fun, four fixes before seeding** (from the review of `winter-ids.json`):
1. "Full" must map to `confirmed_full`, not unknown (16 of 30 rows).
2. The city lists 34 sessions; print the 4 that aren't matched.
3. Store the check time with every availability value.
4. Add price and daily start and end times for each session.

## Rules

- Facts only from the camp's own site or a call, each with a source link and check date. Never from
  directories (OurKids, Childslife, Facebook events) and never invented.
- No camp photos or logos without written permission. The card works without a photo.
- Unknown stays unknown: use the card's existing "to confirm" states, never "N/A" or a guess.
- Every camp is listed on its merits: no paid placement, no ranking by partnership.
- Only camp files: `components/camps`, `lib/camps`, `data/camps`, `app/camps`, `supabase/seeds/camps`,
  and a migration only if a column is truly missing. Don't touch Discover or venue files.
- Work on a branch. Open a PR. Don't merge, publish or run SQL against the live database.
- The PR includes: phone and desktop screenshots of `/camps` with the winter cards, a screenshot of a
  card with an unknown field, the test results, and the list of seed files with what each loads.

## Done means

- [ ] `/camps` in production lists the published winter camps, and nothing that's still a draft.
- [ ] Each card shows dates, ages, hours, price and where, or the honest "to confirm" state.
- [ ] Spots and "Full" always show their check date.
- [ ] Register goes to the exact session or winter page.
- [ ] Works at 390px wide with no sideways scrolling; the save heart and button are at least 44px.
- [ ] Tests pass, including "a draft camp is not visible to the public".
- [ ] Seeds load as drafts, run twice without errors, and publish in a separate step.

## Not in this brief

The camp detail page redesign, the summer planner, alerts, reviews, partner booking, summer and
March break camps. Those come after the Jan 1 launch (see the Docs spec, Phases).
