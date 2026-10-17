# Discover data contract

Discover is the foundation every other pillar reads from. Plan filters it, Learn features it, and Profile only saves parents from re-entering Plan's inputs. A place is useful to Plan only when every fact below is recorded.

Migration: `supabase/migrations/20261017020000_discover_places_plan_fields.sql`
Types: `data/discover/types.ts`
Check: `lib/discover/planReadiness.ts` (`planReadiness(place, venue)` lists what is missing)

## Plan-ready facts

| Fact | Column(s) on `places` | Ready when |
| --- | --- | --- |
| Age range | `age_min`, `age_max`, `all_ages` | Both ages recorded, or `all_ages` verified (and no `age_max`) |
| Indoor / outdoor | `setting` | Not `unknown` |
| Opening hours | `hours_kind`, rows in `place_hours` | Not `unknown`; `fixed` also needs at least one weekly row |
| Cost tier | `cost_tier` | Not `unknown` |
| Typical visit length | `typical_visit_minutes` | Whole minutes, 1–1440 |
| Toddler-friendly | `toddler_friendly` | `yes` or `no` |
| Stroller-friendly | `stroller_friendly` (falls back to the venue's) | `yes` or `no` on the place, or on its venue when the place's is `unknown` |
| Map location | `latitude`, `longitude` (falls back to the venue's) | A valid pair on the place or its venue |
| Source and verified date | `source_url`, `source_checked_date` | Both present; shown to parents as "latest verified [date]" |

A verified `no` is a fact, not a gap. `unknown` is always a gap. Readiness is checked in code rather than with NOT NULL constraints, so research rows can be saved as drafts while facts are still being gathered.

## Rules

- **Unknown is not no.** Plan never treats an unknown fact as a match. An `unknown` setting never passes a weather filter.
- **Place facts beat venue facts.** A place borrows coordinates or stroller access from its venue only when its own fact is missing. A place-level `no` is never overridden.
- **Readiness is not publication.** A Plan-ready place still needs the explicit publish step (`publication_state = 'published'` and `published_at`).

## Categories

UI cards map to `public.discover_category` in `lib/discover/categories.ts` (`DB_CATEGORIES_BY_SLUG`):

| Card | Database categories |
| --- | --- |
| Parks & Nature | `parks_nature` |
| Play & Entertainment | `play_entertainment`, `splash_pads` (legacy), `indoor_play` (legacy) |
| Learning & Culture | `learning_culture` |
| Events | `events` |
| Classes & Programs | `classes` |
| Camps | `camps` |
| Food & Treats | `food_treats` |
| Travel & Getaways | `getaways` |
| Shopping | `shopping` |
| Services | none (separately governed, later) |

New rows should use `play_entertainment` with the specific kind in `place_type` (e.g. "Splash Pad"). `other` belongs to no card.

## Opening hours

`place_hours` holds weekly rows: ISO weekday (1 = Monday ... 7 = Sunday), `opens_at`, `closes_at`, and an optional `valid_from` / `valid_to` window for seasonal hours such as splash pads. Rows are publicly readable only when their place is published.

## Tourism region

`cities.tourism_region` holds the Ontario tourism region code ('1' to '12', '13a', '13b', '13c') from the provincial Tourism regions dataset. Mississauga and Brampton are '5'; Oakville is '3'.

## Open decisions

- **Cost tier thresholds.** Proposed per family visit: free = $0, budget = under $20, moderate = $20–60, premium = over $60. Not yet confirmed.
- **Typical visit length** is a researcher's estimate of a normal family visit; agree on how it is judged before bulk research starts.
