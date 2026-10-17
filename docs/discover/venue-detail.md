# Discover venue detail pages

One page per venue location: `/discover/<category>/<venue-slug>`, e.g. `/discover/play/maple-leap-play-centre-heartland`. Each branch is its own `places` row with its own slug, so branches never share a page.

- Route: `app/discover/[slug]/[venue]/page.tsx` (404 page beside it)
- View model: `lib/discover/venueDetail.ts`
- Layout: `components/discover/VenueDetail.tsx`; tools in `components/discover/VenueTools.tsx`
- Types: `data/discover/venueTypes.ts`
- Schema: `supabase/migrations/20261017030000_discover_venue_detail.sql`
- Catalog: `lib/discover/venuesCatalog.ts`
  - **Production** reads one published, open venue by slug from Supabase (`lib/discover/venuesSupabase.ts`, PostgREST over `fetch`). It uses the **anon key only**, so row-level security still decides what is visible; the query repeats the publication/operating filters and the mapper drops any `needs_follow_up` fact as a second check. Without the settings below, production serves no venues and every venue URL 404s.
  - **Development** serves the fictional fixtures (`data/discover/venues.dev.ts`) plus a preview of real records (PE-001) as they would look once published, under a "DEV PREVIEW" banner.
- Real records: `data/discover/venues/*.ts` (reviewed TypeScript, stored as drafts) → seed SQL in `supabase/seeds/discover/`.

### Production settings (server-side only)

| Variable | Use |
| --- | --- |
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | Project URL |
| `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Public anon key. The service-role key is never used for venue pages. |

### Search indexing

| Page | robots |
| --- | --- |
| Published venue read from Supabase in production | `index, follow` |
| Dev fixtures and dev previews | `noindex, nofollow` |
| Not found, draft, closed, unknown status, wrong category | `noindex` (404) |

### Publishing a real record

1. Edit the record in `data/discover/venues/` (it stays `publicationState: "draft"`).
2. Regenerate the SQL: `npx tsx scripts/discover/build-venue-seed.ts`. A test fails if the committed files are out of date.
3. **Load** `supabase/seeds/discover/<id>-<slug>.sql`. It inserts the city and the place **as a draft**, replaces the place's child facts (deterministic ids, so re-runs replace rather than duplicate) and never changes an existing place's `publication_state` or `published_at`. Follow-up facts are stored but hidden.
4. Review the draft, then **publish** with `<id>-<slug>.publish.sql`. It sets `published` (keeping an earlier `published_at`) only if the place is open and has an https source and a check date; otherwise it raises and rolls back.

Nothing in the app applies either file.

How the PE-001 seed fits the migration's checks:

| Seed row | Check | Why it passes |
| --- | --- | --- |
| First-hand theme with no `source_url` | `place_experience_themes_source_chk` | First-hand notes are exempt from the URL rule; the date is still required |
| Eight reviewer themes with no `review_source_id` | `place_experience_themes_reviewer_source_chk` | Stored as `needs_follow_up`; a reviewer theme can only be `verified` once its source exists |
| "Buy 2 Get 2 Free" with no `valid_to` | `place_prices_promo_chk` | Stored as `needs_follow_up`; a promotion can only be `verified` with an end date |

`source_url` is `not null` on every other child table; the theme table declares it nullable for the first-hand case above.

## Who gets a page

A venue is public only when it is published (`publication_state = 'published'`, `published_at` set), its `operating_status` is `open`, and it has a `source_url` and a valid `source_checked_date`. Drafts, archived, temporarily or permanently closed, unknown-status and unsourced rows return the not-found page. A venue filed under one category is not served under another.

## Provenance

Every child fact (types, age bands, activities, prices, programs, amenities, policies, links, review sources, experience themes) carries `source_url` (https), `source_checked_date` and `verification_status`:

| Status | Shown? |
| --- | --- |
| `verified` | Yes, with "Checked <date> · Source" |
| `conflicting` | Yes, with the required `conflict_note` and listed under "Sources disagree" |
| `needs_follow_up` (default) | Never — also blocked by row-level security |

No row = **not confirmed**. A row with amenity status `no` or activity availability `not_offered` = **verified unavailable**. These are shown differently.

## Research checklist → data

| Checklist section | Where it lives |
| --- | --- |
| 1. Identity | `places`: name, `branch_name`, `aliases`, city, `setting`, `operating_status`, `description`; `place_types` (one row per evidenced type, `is_primary`) |
| 2. Decision snapshot | `places` ages / `all_ages` / `typical_visit_minutes`; `place_age_bands` (0–2, 3–5, 6–9, 10–12, 13–17, adults); policies `age_guidance`, `height_limit`, `weight_limit`, `restriction`, `supervision`; themes `age_fit`, `activity_level`; rainy-day text from `setting` |
| 3. Activities | `place_activities`: availability at this branch, age/height/weight limits, `included_in_admission`, `schedule` |
| 4. Getting there | `places.address_line`, `postal_code`, coordinates; amenities `parking`, `accessible_parking`; policies `transit`, `location_note` |
| 5. Hours, booking, rules | `place_hours` (+ seasonal windows); policies `hours_note`, `booking_rule`, `waiver`, `arrival`, `dress_socks`, `food_rule`, `cancellation`; `place_links` booking / tickets / reservation / registration, website, phone |
| 6. Prices | `place_prices` with `kind` (admission, addon, membership, package, party, group, promotion, fee), audience, ages, duration, `includes_note`, `required_addon`, `plus_tax`, `eligibility`, `valid_to` (required for promotions; expired offers are hidden) |
| 7. Amenities | `place_amenities`; the page reports a fixed checklist as Confirmed / Not available / Not confirmed |
| 8. Programs | `place_programs` (ongoing, seasonal, dated; finished dated programs are hidden) |
| 9. Parent experience | `place_experience_themes` (basis `venue_published` / `reviewer_reported` / `first_hand_visit`, sentiment, agreement) and `place_review_sources` |
| 10. Sources | Built from every displayed fact: source, what it supports, latest check date, conflicts |

Page tools: "Will this work for my kids?" (ages vs. published limits), family cost estimate (verified admission prices per group — children, adults taking part, adults watching — plus required extras applied by their audience and charging rule; extras with no stated rule or price, optional extras and offers are left out and named; prices used, tax treatment and assumptions listed), before-you-go checklist (from verified rules only), share. **Save** and **compare with nearby venues** are not built: the saved list only supports camps today, and there is no venue listing to compare against yet.

## Reviews

- **No Google integration is configured**, so automated retrieval is off (`AUTOMATED_REVIEW_RETRIEVAL_ENABLED = false`). Review sources are entered by hand after a permitted check. No API key is in client code.
- Review text is never stored. Themes are written in Compass's own words (max 400 characters) and linked to the source they came from.
- Google Places reviews: at most five per place, always described as "not all Google reviews", and only shown with provider attributions (author names with links).
- Google review summaries: shown only with Google's exact `provider_disclosure` and attributions; otherwise withheld.
- Ratings appear only as the source states them, only for customer-review sources, with the date seen.
- Editorial sources (blogs, guides) are perspectives, never counted as reviews.
- "What to expect" says **Limited information** unless there are at least two reviewer themes from at least two sources and none are mixed.
- First-hand visit notes appear under their own heading, never mixed into review themes. Nothing is written as though Compass staff visited unless a `first_hand_visit` theme says so.

## PE-001 Sky Zone Mississauga

Source: the final PE-001 profile (last researched 2026-09-24); facts cite the official location site, `https://www.skyzone.com/ca-mississauga/`.

| Shown | Kept hidden (`needs_follow_up`) and why | Not stored |
| --- | --- | --- |
| Address, Hub Climbing location note, indoor setting, four types (Trampoline Parks primary), ten activities, age bands and all-ages eligibility, five prices, Fuel Zone / party rooms / SkySocks, supervision, waiver, socks and booking rules, visit length, website link, the first-hand drop-off note | Eight reviewer themes: the record names no review sources, dates or sample sizes. "Buy 2 Get 2 Free": no end date recorded. Elite and 2026 Annual Pass: "also seen", possibly seasonal | Weekly hours, a booking URL, the SkySocks price, and everything the record lists as "not yet confirmed" (kosher pizza, parking, Wi-Fi, parent seating, stroller storage, change tables, GLOW / Toddler Time / Sensory Hours programs, party tiers) |

"What to expect" therefore says **Limited information** until review sources are added (`place_review_sources` rows with dates and coverage notes, then each theme linked to its source and marked verified).

The estimator uses the 120-minute ticket for children and adults who jump. It leaves out adults who only watch (no price recorded) and SkySocks (required, price not recorded), and says whether tax is included is not stated.

## Open items

- **Play & Entertainment taxonomy (dependency).** The repo has no taxonomy export: `lib/discover/categories.ts` holds only the top-level browse cards. `place_types.place_type` stays free text and PE-001 uses the labels supplied in its record. When the canonical export is added, validate `place_types` against it instead of creating a second list here.
- Review sources for PE-001 (see above).
