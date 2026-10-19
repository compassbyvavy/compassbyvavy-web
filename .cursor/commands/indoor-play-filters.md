# Build the Indoor Play filters

Build the filter system for the Mississauga **Indoor Play** listing (Discover → Play & Entertainment).
Work in the four phases below. **Stop after each phase, show me the diff and wait for my go-ahead**
before starting the next one. Don't do everything in one large change.

Anything I type after the command name is extra context for this run (for example "phase 2 only" or
"data file is at data/play/indoor-play.json"). Follow it if given.

---

## Ground rules (apply to every phase)

1. **Copy the Camps pattern; don't invent a new one.** Read these first and match their structure,
   naming, styling and test style:
   - `lib/camps/listingFilter.ts`: pure filter logic, `EMPTY_LISTING_FILTERS`, `countActiveFilters`,
     `listActiveFilterChips`, `removeActiveFilterChip`, `parseListingHrefSearch` (URL sync)
   - `components/camps/CampsFilterPanel.tsx`: sidebar and drawer variants
   - `components/camps/CampsListingClient.tsx`: chips row, active-filter chips, reset, URL sync, focus handling
   - `lib/camps/*.test.ts`: tests run with `tsx --test` through the `test:camps` script
   - `app/globals.css`: there is no Tailwind; use the existing CSS and design tokens
2. **Facts come from tested logic.** Store raw venue facts (ages, prices, weekly hours). Derive
   filter values with pure, unit-tested functions. Store a tag by hand only when it can't be
   derived (see the "Source" column below).
3. **Never claim live status.** No "Open now". Show times as hours "as of [checked date]". Every price
   and every set of hours carries a `checkedAt` date.
4. **Honest gaps.** A venue with an unknown value stays visible and gets a clear label ("Call for
   price"). It is never hidden, and its price is never guessed. Use the two missing-data phrases
   exactly: "Not published by the venue" when the venue's own source was checked and doesn't
   say; "Not recorded" when we haven't confirmed it.
5. **Inclusion.** Venues with status `closed` never appear. `booking_only` venues appear, with a
   "Booking only" label. `needs_check` venues are excluded from public results unless the data file
   marks them `publish: true`.
6. **Don't flip the category live.** `lib/discover/categories.ts` keeps `play` as `coming_soon`.
   Build behind a preview route, as Camps did with `app/camps/preview`, until I say otherwise.
   Never attach fake listings to a public page; dev fixtures stay dev-only.
7. **Layout.** Clean and minimal, like Airbnb. Filter chips across the top on desktop and a
   drawer on mobile. No bottom tab bars. Use `aria-pressed` on chips, and the panel must work by
   keyboard.

---

## The filter spec

There are 15 filters. **Main** filters show as chips. **More** filters sit behind a "More filters"
button. **Combined** filters are computed from other filters and never stored.

### Main

| Filter | Options | Selection | Source |
|---|---|---|---|
| Age group | Babies (0–1) · Toddlers (1–3) · Preschool (3–5) · Kids (5–8) · Big kids (8–12) · Tweens & teens (12+) | Multi | Derive from `ageMinMonths` / `ageMaxYears`, then apply `hardMinimumAge` (e.g. laser tag 6+). A height-only rule (e.g. "under 130 cm") can't be turned into ages: use the manual `ageGroupsOverride` |
| Price per child | Free · Under $15 · $15–25 · $25–35 · $35+ · Call for price | Single | Derive from `weekdayChildPrice` (standard weekday entry for one child, before tax). `null` gives "Call for price". `isFree: true` gives Free |
| When | Weekday mornings · After school · Weekends · Evenings · PA days & holidays | Multi | Derive from structured `weeklyHours`. Weekday mornings means open before 12:00 on at least one Mon–Fri day. After school means open at 15:30–17:30 on a weekday. Weekends means open Saturday or Sunday. Evenings means open at or after 19:00 on any day. PA days & holidays is the manual `paDayHours` flag |
| How to visit | Walk in · Book ahead · Private booking only | Single | Manual `visitMode` |
| Area | City Centre · Erin Mills/Ridgeway · Heartland/Argentia · Applewood/Dixie · Cooksville/Hurontario · Meadowvale · Airport corridor | Single | Manual `area`. The city stays fixed from the site header's city picker |

### More filters

| Filter | Options | Selection | Source |
|---|---|---|---|
| Activity | Soft play · Trampoline · Climbing · Ninja course · Laser tag · Arcade · VR · Mini golf · Sensory play | Multi | Manual `activities[]` |
| Good for toddlers | Yes | Toggle | Derive: `hasToddlerZone \|\| hasToddlerTime` |
| Adults | Adult enters free · Adult pays | Single | Derive from `adultPrice` (`0` or "included with child ticket" means free) |
| Food | Café on site · Outside food allowed | Multi | Manual `hasCafe`, `outsideFoodAllowed` |
| Socks | Grip socks required · Sold on site | Multi | Manual `gripSocksRequired`, `socksSoldOnSite` |
| Parties | Hosts birthday parties | Toggle | Manual `hostsParties` |
| Visit length | Unlimited day pass · Timed session | Single | Manual `sessionType` |
| Sensory-friendly | Yes | Toggle | Manual `sensoryFriendly` |

### Combined (computed, never stored)

| Filter | Rule |
|---|---|
| Mixed ages | The venue's age groups include Toddlers **and** at least one of Kids, Big kids, or Tweens & teens |
| Rainy weekday morning | "Weekday mornings" is true **and** the price band is Free or Under $15 |

Price band edges: Under $15 is `< 15`, $15–25 is `15 ≤ p < 25`, $25–35 is `25 ≤ p < 35`, and $35+ is
`≥ 35`. Age bands overlap at their edges on purpose. A venue for ages 3–5 matches both Toddlers
(1–3) and Preschool (3–5).

---

## Phase 1: Types and data shape

1. Create `data/play/types.ts` with an `IndoorPlayVenue` type holding every raw field named in the
   "Source" columns, plus: `code` (PE-XXX, using the live site's numbering, e.g. Amazing Fun Park =
   PE-001), `name`, `slug`, `address`, `status` (`open | needs_check | booking_only | closed`),
   `publish` (boolean), `checkedAt` (ISO date), and `adminNotes`. Admin notes must never be
   rendered publicly.
2. If a data file already exists at the path I give (or at `data/play/indoor-play.json`), type
   it and validate it at load. Otherwise create `data/play/fixtures.dev.ts` with **4 clearly fake**
   venues that cover the edge cases: a free venue, a venue with a null price, a booking-only venue
   and a venue with a height-only age rule.

Stop. Show me the types.

## Phase 2: Pure filter logic and tests

1. Create `lib/play/indoorPlayFilter.ts`, mirroring `lib/camps/listingFilter.ts`:
   - `IndoorPlayFilters` type and `EMPTY_INDOOR_PLAY_FILTERS`
   - Derivers: `deriveAgeGroups`, `derivePriceBand`, `deriveWhen`, `deriveAdults`,
     `deriveGoodForToddlers`, `deriveMixedAges`, `deriveRainyWeekdayMorning`
   - `venueMatchesFilters(venue, filters)`: multi-select filters match **any** selected
     option within a filter, and **all** filters must match together
   - `buildIndoorPlayResults(venues, filters)`: applies the inclusion rules (ground rule 5), then
     the filters
   - `countActiveFilters`, `listActiveFilterChips`, `removeActiveFilterChip`
   - URL sync helpers matching `parseListingHrefSearch`, with short and stable query keys
2. Create `lib/play/indoorPlayFilter.test.ts`. Cover every deriver and every edge in the spec:
   - price exactly $15, $25 and $35
   - null price gives "Call for price" and the venue is still listed
   - a closed venue is never listed
   - a booking-only venue is listed with its label
   - a needs-check venue is hidden unless `publish: true`
   - hard minimum age 6 removes Toddlers and Preschool
   - weekday opening at 12:00 is **not** a weekday morning
   - Mixed ages and Rainy weekday morning, true and false cases
   - a URL round-trip of a full filter state
3. Add `lib/play/**/*.test.ts` to the test script (rename it if needed) and run it. All tests must pass.

Stop. Show me the logic and test results.

## Phase 3: Filter UI

1. Create `components/play/IndoorPlayFilterPanel.tsx`, mirroring `CampsFilterPanel`, with
   `sidebar` and `drawer` variants:
   - Main filters as chip rows. Price per child is a single choice.
   - A "More filters" section, collapsed by default.
   - Combined filters as two shortcut chips at the top: "Mixed ages" and "Rainy weekday morning".
2. Create `components/play/IndoorPlayListingClient.tsx`, mirroring `CampsListingClient`. Include:
   - the active-filter chips row, each chip removable
   - a "Reset all" control
   - a result count
   - URL sync, so the Back button restores filters
   - an empty state that suggests which filter to loosen
3. On each venue card, show the price band (or "Call for price"), the age groups, a "Booking only"
   label where it applies, and "Hours as of [checkedAt]".

Stop. Show me screenshots or the rendered markup at desktop and phone widths.

## Phase 4: Preview route

1. Add `app/discover/play/indoor/preview/page.tsx`, using the same gating approach as
   `app/camps/preview` (read `lib/camps/reviewPreviewGate.ts`). Set it to `noindex`.
2. Leave `lib/discover/categories.ts` unchanged.
3. Run `npm run build` and the tests. Fix anything that fails.

Stop. Summarize what was built, what is still manual data entry, and anything in the spec you
couldn't implement as written.
