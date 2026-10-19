# Feature Applicability Matrix

What a parent actually needs on a profile, in priority order, by place type.

This is the matrix the north star assumed and this repo did not yet have. Studio `EXPERIENCE_ASPECTS` is **not** in this checkout; this file is the source of truth. Category chats start here, then round out the template — they do not skip to amenity laundry lists.

Omit a field when it does not apply. Unknown is omitted or explicit `unknown` — never filled with a guess.

## How to use

1. Take **Shared (all places)** as the floor.
2. Add the category’s **parent-priority** fields. Those ship before generic amenities.
3. Map each field to: catalog type → profile UI. Reuse existing components when they exist; add a section only if the field cannot be shown honestly.
4. Record **source, checked date, and scope** beside important facts.
5. Leave Founder Note / Final Verdict empty for the founder.

Applicability: **Y** = expected on a complete profile, **S** = sometimes (only if the place type has it), **—** = do not invent a slot that implies the feature exists.

## Shared (all places)

Parent-priority, ahead of amenity lists:

| Field | Why it is first | Notes |
| --- | --- | --- |
| Identity + neighbourhood | “Where is this, really?” | City Mississauga unless Travel. Neighbourhood over a vague “west end.” |
| Best-for age band | Filters the outing before romance | Toddler vs school-age vs mixed. Not a marketing “all ages” default. |
| Cost structure | Decision, not decoration | Free / paid / mixed. Unknown fees are not zero. Unit required when paid. |
| Duration | Fits the afternoon | Typical family dwell time, not official operating hours alone. |
| Latest verified date | Trust | Visible near the facts it supports. |
| Go-if / skip-if | Honest match | Specific (“skip if you need shade at noon”), not vibe. |
| Honest downsides | Trust | Founder voice when visited; otherwise omit rather than invent friction. |
| Parking | Plan the arrival | `free` / `paid` / `street` / `limited` / `unknown`. |
| Washrooms | Deal-breaker with young kids | Including seasonal closure when that applies. |
| Accessibility / stroller | Who can actually go | Paths, ramps, elevator, stroller in galleries — specific, not a badge. |

Shared supporting fields (include when known):

| Field | Applicability |
| --- | --- |
| Setting (indoor / outdoor / both) | Y |
| Seasons / typical weather dependency | Y |
| Shade | S (outdoor) |
| Picnic | S |
| Food on site / nearby | S |
| Safety notes (water, roads, supervision) | S — facts, not a safety rating |
| What to bring (suggested vs required) | S — keep those distinct |
| Nearby pairing | S — only real Compass pages or clearly labelled “not yet a Compass page” |
| Founder Note / Final Verdict | S — empty slot until the founder writes it |
| Real photos | Y — or pending slots, never stock |

## Play & Entertainment

Indoor play, trampoline parks, arcades, rainy-day fallbacks. Splash pads may sit with Play or Parks; say so on the profile, do not duplicate fake listings.

Parent-priority (ahead of generic amenity lists):

| Field | Y/S/— | Notes |
| --- | --- | --- |
| Age / height / weight limits | Y | Per attraction when they differ. Unknown ≠ “no limit.” |
| Socks-only / grip-sock policy | S | Indoor play / trampoline. |
| Waiver required | Y | Yes / no / unknown. Do not invent “sign at door.” |
| Admission structure | Y | Per-child vs flat fee; time-boxed sessions vs open play; adult pricing. |
| Food policy | Y | Outside food, café, peanut notes only if sourced. |
| Best-for age band | Y | Arcade vs toddler soft play are different products. |
| Rainy-day fit | Y | Why this is (or isn’t) the weather-proof option. |
| Session / last-entry times | S | Time-boxed venues. |
| Socks / lockers / storage | S | |
| Party vs drop-in | S | Do not imply party rooms without a source. |

## Parks & Nature

Shorelines, trails, playgrounds, conservation areas, splash at parks.

Parent-priority:

| Field | Y/S/— | Notes |
| --- | --- | --- |
| Playground zones / surfaces | S | Age zones, rubber vs sand/wood, fenced or not. |
| Splash pad | S | Seasonal; “latest verified” for open status — never imply real-time. |
| Shade | Y | Trees vs none; noon in July is a different park. |
| Picnic | Y | Tables, lawn, nearby washrooms. |
| Water safety | S | Lake / creek / unsupervised water. Facts, not a swim-safety rating. |
| Seasonal washrooms | Y | Winter closure is a planning fact. |
| Parking | Y | Weekend fill-up when observed. |
| Stroller / path surface | Y | Boardwalk vs rooty trail. |
| Fenced vs open | S | Toddlers. |
| Dogs | S | Only if verified; unknown is omitted. |

If a signature Lighthouse-style park template is added later, **reuse it**. Do not invent a third park format.

## Learning & Culture

Museums, libraries, galleries, science centres, heritage sites.

Parent-priority:

| Field | Y/S/— | Notes |
| --- | --- | --- |
| Exhibit / visit pace | Y | 45-minute drop-in vs half-day. |
| Drop-in vs timed ticket | Y | |
| Membership vs one-off | S | Do not imply a Compass discount. |
| Bag / stroller rules in galleries | Y | |
| Quiet hours / sensory notes | S | Only if the venue publishes them. |
| Age fit of current exhibits | S | Dated; exhibits rotate. |
| Storytime / program vs the building | S | A library building ≠ a specific storytime listing. Keep them distinct (see Events / Classes). |

## Food & Treats

Family-friendly restaurants, ice cream, kid-approved spots. Lowest trust-stakes of Discover — still no invented hours or superlatives.

Parent-priority:

| Field | Y/S/— | Notes |
| --- | --- | --- |
| High chairs | Y | yes / no / unknown |
| Kids menu | Y | |
| Noise / energy | S | Observed, founder-visited preferred. |
| Typical wait | S | Only if verified; never “always packed.” |
| Change table | Y | |
| Outdoor seating | S | |
| Reservations | Y | Required / accepted / walk-in / unknown |
| Stroller in aisle | S | |
| Allergen notes | S | Never auto-shared; never medical advice. Only venue-published policy. |

## Travel & Getaways

Day trips, worth-the-drive destinations, weekend escapes.

Parent-priority:

| Field | Y/S/— | Notes |
| --- | --- | --- |
| Drive time from Mississauga | Y | Band, not fake-precise minutes. |
| Boat / operator options | S | Distinct operators; confirm landing options with the operator. |
| Packing | Y | Suggested vs required. |
| Backup plan if weather cancels | Y | Especially boats, islands, shoulder season. |
| Picnic / food on site | Y | Pack-in/pack-out when that is the rule. |
| Itinerary options by energy | S | e.g. shorter vs longer landing — only from a provided write-up. |
| Overnight vs day | Y | Keep distinct from Camps overnight. |

Worth-the-Drive pages in this repo must be composed from a **provided write-up**. Flag anything the write-up does not cover. Do not invent a 34-section destination from a tourism homepage.

## Camps

Authoritative behavior: [`docs/camps/compass-camps-page-spec.md`](../camps/compass-camps-page-spec.md). Types: [`data/camps/types.ts`](../../data/camps/types.ts).

Keep **Provider / CampProgram / CampSession / Venue** distinct.

Parent-priority (a useful camp page):

*Can my child attend this session, on these dates, at this venue, for these hours, at this cost — and what exactly must I do next?*

| Field | Notes |
| --- | --- |
| Eligibility (age/grade, assessment date rule) | Do not assume “as of today.” |
| Dates | Unverified dates ≠ no sessions. |
| Venue / neighbourhood | Actual venue, not only provider HQ. |
| Core hours + care window | Separate before/after-care booking when required. |
| Price + unit | per-day / per-week / full-program. Unknown fees are not zero. |
| Registration action | Spec mapping only. Waitlist is first-class. Open registration ≠ a seat. |
| Prerequisites / support / policies | After booking facts, not instead of them. |
| Packing | Suggested vs provider-required. |

Sourcing tiers to settle before the first production profile (founder-visited / source-checked / provider-confirmed) must stay consistent with the spec. Ingestion may propose; it must not publish.

## Classes & Programs

Recurring lessons: swim, dance, music, art, sports, tutoring. **Separate from Camps** in navigation and records.

Borrow the camps pattern: provider vs program vs dated session vs venue; eligibility; term dates; hours; price unit; registration action mapping. Do not start a third registration model.

Local terms: PA days, not Pro-D days. “STEM,” “March Break,” and “half-day” describe different things — keep filters distinct.

## Shopping

Toy stores, kids’ consignment, family-friendly retail.

Parent-priority:

| Field | Y/S/— |
| --- | --- |
| Parking | Y |
| Stroller aisles | Y |
| Change table | S |
| Play corner | S |
| New vs consignment | Y |
| Hours | Y — latest verified, not implied real-time |

## Events

Festivals, seasonal happenings, free community days. **Expire.**

The template is a **sourcing-and-refresh process**, not a one-time profile.

| Field | Notes |
| --- | --- |
| Start / end (datetime + timezone) | Required to publish. |
| Rain plan | Omit if unknown; do not invent “rain or shine.” |
| Cost / registration | Free entry ≠ free food. |
| Age / best for | |
| Expiry | Record when the listing must come down. |
| Next refresh date | Operational, visible as “Latest verified.” |

Never invent a dated weekend rail. An empty “this weekend” is correct.

## Services

**Not in this matrix until governance exists.**

Future Services chat #1 defines, before any listing:

- Directory facts vs editorial vs prohibited claims
- The review process (who can approve a pediatrician row)
- What Compass will never say (treatment quality, “best doctor”)
- Health/allergy data never auto-shared

Until then, [`DISCOVER_CATEGORIES` Services](../../lib/discover/categories.ts) stays `coming_soon` and must not read as a provider directory.
