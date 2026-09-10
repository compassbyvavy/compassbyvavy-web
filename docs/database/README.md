# Compass website database (schema v1)

Target Supabase project: **compassbyvavydev** (`jjnkcgjcdffzgxczsqrk`).

This folder documents the website domain model. The migration lives at:

`supabase/migrations/20260910180000_compass_website_schema_v1.sql`

It creates **empty structure only**. It does not seed catalog rows and it does not publish anything.

## Domain tables

| Table | Role |
| --- | --- |
| `cities` | Localities (`country` + `province_state` + `city_town` unique). Publicly readable. |
| `providers` | Organizations. Research columns follow the Camp Research Master **Providers** sheet. Draft until explicitly published. |
| `venues` | Physical/online locations. Nullable lat/lng. Accessibility facts as yes/no/unknown tri-states. |
| `places` | Discover listings (`discover_category` required). Parks, splash pads, indoor play, food, getaways, and other place-like rows. |
| `events` | Dated public events. |
| `class_programs` | Stable class program identity. |
| `class_sessions` | Dated class offerings. |
| `camp_programs` | Stable camp program identity (slug, typical ages, themes). Typical ages are **not** session eligibility. |
| `camp_sessions` | Dated camp offerings. `registration_status` (lifecycle) is separate from `seat_availability` (capacity). Age assessment and care windows live on the session. |
| `camp_packing_items` | Required vs suggested packing lines for a program. |
| `camp_research_candidates` | **Private staging** from the workbook (`candidate_id` PK, `inspection_decision`, `raw` jsonb + sheet fields). No anon/authenticated policies. |
| `site_submissions` | Waitlist / missing camp / correction / general. Insert for `anon` and `authenticated`. |
| `profiles` | One row per `auth.users` id. Owner-only. |
| `family_children` | Children on a profile. Owner-only. |
| `saved_items` | Shortlist. Owner-only. |
| `plan_entries` | Family plan rows. Owner-only. |

Catalog IDs are stable **text** keys (workbook / research IDs), not random UUIDs, except packing items, submissions, and user-owned rows.

## Publication vs research

Public `SELECT` on catalog tables (except `cities`) requires:

- `published_at IS NOT NULL`
- `publication_state = 'published'`

`cities` is readable without that gate so locality filters work before a city has published listings.

New catalog rows default to `publication_state = 'draft'` and `published_at = null`.

**Workbook `Add` / `inspection_decision = add` does not auto-publish.** Staging stays in `camp_research_candidates` (and draft catalog rows if a human maps them). A separate, explicit publish step must set `publication_state` and `published_at`.

## Apply notes

Do **not** apply this migration as part of website deploy or seed jobs. Apply it once, deliberately, against **compassbyvavydev** when you intend to install website schema v1.

```bash
# Example only — run from a machine with Supabase CLI linked to compassbyvavydev.
supabase db push
```

Idempotent pieces:

- Enums use `duplicate_object` exception handlers.
- `CREATE TABLE IF NOT EXISTS` for all tables.
- Before `CREATE` of `places`, a `DO` block drops a leftover **empty** `public.places` that lacks column `category`. If that leftover table has rows, the migration **raises** instead of dropping it. This avoids PostgreSQL `ERROR 42703` (undefined column) from creating indexes on `category` / `published_at` against an older `places` shell.
- `places` indexes are created only inside `DO` blocks that check `information_schema` for `category` and `published_at`.

`camp_research_candidates` has RLS enabled and **no** policies for `anon` or `authenticated`. Access is service role / table owner only.

This website schema is distinct from any earlier VDB-001 geography/`content_items` experiment. If an empty `public.places` without `category` is present, v1 will replace that leftover shell. Do not apply if `places` already holds rows you need to keep.

## Out of scope for this migration

- Seeding Mississauga (or any) catalog rows
- Copying Camp Research Master workbook rows into public tables
- Auto-publish from inspector `Add`
- Edge functions, storage, or app query wiring
