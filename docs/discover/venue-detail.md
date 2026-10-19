# Discover venue detail pages

One page per venue location: `/discover/<category>/<venue-slug>`, e.g. `/discover/play/maple-leap-play-centre-heartland`. Each branch is its own `places` row with its own slug, so branches never share a page.

- Route: `app/discover/[slug]/[venue]/page.tsx` (404 page beside it)
- View model: `lib/discover/venueDetail.ts`
- Layout: `components/discover/VenueDetail.tsx`; tools in `components/discover/VenueTools.tsx`
- Types: `data/discover/venueTypes.ts`
- Schema: `supabase/migrations/20261017030000_discover_venue_detail.sql`
- Catalog: `lib/discover/venuesCatalog.ts` — dev fixtures outside production; **production returns nothing** until a published-records read path is wired, so every venue URL 404s there.

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

Page tools: "Will this work for my kids?" (ages vs. published limits), family cost estimate (verified prices plus required extras, assumptions listed), before-you-go checklist (from verified rules only), share. **Save** and **compare with nearby venues** are not built: the saved list only supports camps today, and there is no venue listing to compare against yet.

## Reviews

- **No Google integration is configured**, so automated retrieval is off (`AUTOMATED_REVIEW_RETRIEVAL_ENABLED = false`). Review sources are entered by hand after a permitted check. No API key is in client code.
- Review text is never stored. Themes are written in Compass's own words (max 400 characters) and linked to the source they came from.
- Google Places reviews: at most five per place, always described as "not all Google reviews", and only shown with provider attributions (author names with links).
- Google review summaries: shown only with Google's exact `provider_disclosure` and attributions; otherwise withheld.
- Ratings appear only as the source states them, only for customer-review sources, with the date seen.
- Editorial sources (blogs, guides) are perspectives, never counted as reviews.
- "What to expect" says **Limited information** unless there are at least two reviewer themes from at least two sources and none are mixed.
- First-hand visit notes appear under their own heading, never mixed into review themes. Nothing is written as though Compass staff visited unless a `first_hand_visit` theme says so.

## Open items

- Play & Entertainment taxonomy: no taxonomy file is in the repo, so `place_types.place_type` is free text. Add the taxonomy export under `docs/discover/` to validate type labels.
- Wire a server-side read of published `places` + child tables to replace the dev catalog.
