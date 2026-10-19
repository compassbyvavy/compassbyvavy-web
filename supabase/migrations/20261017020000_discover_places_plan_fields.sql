-- =============================================================================
-- Discover: Plan-ready place fields
-- Target project: compassbyvavydev (jjnkcgjcdffzgxczsqrk)
--
-- Adds the facts the Plan tool filters on ("rainy, two kids aged 2 and 7, free
-- this afternoon") to public.places, plus a place_hours table and a tourism
-- region on cities. Structure only: no seed rows, nothing published.
--
-- Unknown is preserved everywhere: every new fact defaults to 'unknown' or
-- null, never to a guessed value. Plan readiness is checked in application
-- code (lib/discover/planReadiness.ts), not by NOT NULL constraints, so draft
-- rows can be saved while research is still in progress.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- discover_category: add the top-level UI categories missing from v1.
-- splash_pads and indoor_play stay as legacy values (both now group under
-- Play & Entertainment in the UI map). ADD VALUE runs outside any block and
-- the new values are not used later in this file.
-- -----------------------------------------------------------------------------
alter type public.discover_category add value if not exists 'play_entertainment';
alter type public.discover_category add value if not exists 'learning_culture';
alter type public.discover_category add value if not exists 'shopping';

begin;

-- -----------------------------------------------------------------------------
-- New enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.place_setting as enum (
    'indoor',
    'outdoor',
    'both',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- Provisional tiers; per-visit thresholds are documented in
  -- docs/discover/README.md and still need a product decision.
  create type public.place_cost_tier as enum (
    'free',
    'budget',
    'moderate',
    'premium',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- How a place's opening hours are known.
  -- fixed        = weekly hours recorded in public.place_hours
  -- dawn_to_dusk = public parks and trails with no gate times
  -- always_open  = genuinely 24/7 (rare; verify before using)
  -- varies       = changes too often to record; Plan shows "check hours"
  create type public.place_hours_kind as enum (
    'fixed',
    'dawn_to_dusk',
    'always_open',
    'varies',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- places: Plan-ready facts
-- -----------------------------------------------------------------------------
alter table public.places
  add column if not exists place_type text,
  add column if not exists all_ages boolean not null default false,
  add column if not exists setting public.place_setting not null default 'unknown',
  add column if not exists cost_tier public.place_cost_tier not null default 'unknown',
  add column if not exists typical_visit_minutes integer,
  add column if not exists toddler_friendly public.confirmed_tri_state not null default 'unknown',
  add column if not exists stroller_friendly public.confirmed_tri_state not null default 'unknown',
  add column if not exists hours_kind public.place_hours_kind not null default 'unknown',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists source_url text,
  add column if not exists source_checked_date date;

do $$ begin
  alter table public.places
    add constraint places_typical_visit_minutes_chk check (
      typical_visit_minutes is null
      or (typical_visit_minutes > 0 and typical_visit_minutes <= 1440)
    );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.places
    add constraint places_latitude_chk check (
      latitude is null or (latitude >= -90 and latitude <= 90)
    );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.places
    add constraint places_longitude_chk check (
      longitude is null or (longitude >= -180 and longitude <= 180)
    );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- all_ages means "verified suitable at any age"; it cannot coexist with a
  -- recorded upper age limit.
  alter table public.places
    add constraint places_all_ages_chk check (
      not all_ages or age_max is null
    );
exception
  when duplicate_object then null;
end $$;

comment on column public.places.place_type is
  'Place type from the Discover taxonomy (e.g. "Splash Pad", "Indoor Playground"). Free text until the taxonomy table lands.';
comment on column public.places.all_ages is
  'True only when verified suitable for every age (e.g. a public park). False means use age_min/age_max; it does not mean "not all ages".';
comment on column public.places.setting is
  'Indoor / outdoor / both. Plan uses this for weather filtering; unknown never passes a weather filter.';
comment on column public.places.cost_tier is
  'Provisional per-visit cost tier for a family. Thresholds live in docs/discover/README.md.';
comment on column public.places.typical_visit_minutes is
  'How long a typical family visit lasts, in minutes. Used to match "free for 2 hours" style Plan inputs.';
comment on column public.places.toddler_friendly is
  'Verified suitability for under-3s. Place-level fact, independent of the venue.';
comment on column public.places.stroller_friendly is
  'Place-level stroller access. When unknown, Plan may fall back to the linked venue''s stroller_friendly fact.';
comment on column public.places.hours_kind is
  'How opening hours are known. fixed requires rows in public.place_hours.';
comment on column public.places.latitude is
  'Place coordinates (e.g. a park entrance) when the place has no venue, or differs from it. Verified only.';
comment on column public.places.source_checked_date is
  'Date the facts on this row were last verified against source_url. Shown to parents as "latest verified [date]".';

create index if not exists places_setting_idx on public.places (setting);
create index if not exists places_cost_tier_idx on public.places (cost_tier);

-- -----------------------------------------------------------------------------
-- place_hours: weekly opening hours, optionally limited to a date window
-- (seasonal splash pads, summer-only hours).
-- weekday follows ISO 8601: 1 = Monday ... 7 = Sunday.
-- -----------------------------------------------------------------------------
create table if not exists public.place_hours (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  weekday smallint not null,
  opens_at time not null,
  closes_at time not null,
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint place_hours_weekday_chk check (weekday between 1 and 7),
  constraint place_hours_time_chk check (opens_at < closes_at),
  constraint place_hours_window_chk check (
    valid_from is null or valid_to is null or valid_from <= valid_to
  )
);

comment on table public.place_hours is
  'Weekly opening hours per place (ISO weekday 1 = Monday). Optional valid_from/valid_to for seasonal hours. Readable only when the parent place is published.';

create index if not exists place_hours_place_id_idx on public.place_hours (place_id);

drop trigger if exists place_hours_set_updated_at on public.place_hours;
create trigger place_hours_set_updated_at
  before update on public.place_hours
  for each row execute function public.set_updated_at();

revoke all on table public.place_hours from anon, authenticated;
grant select on table public.place_hours to anon, authenticated;

alter table public.place_hours enable row level security;

drop policy if exists place_hours_public_read on public.place_hours;
create policy place_hours_public_read
  on public.place_hours
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.places p
      where p.id = place_hours.place_id
        and p.published_at is not null
        and p.publication_state = 'published'::public.publication_state
    )
  );

-- -----------------------------------------------------------------------------
-- cities: Ontario tourism region
-- Codes follow the Ontario Ministry of Tourism, Culture and Gaming
-- "Tourism regions" dataset: '1' .. '12', '13a', '13b', '13c'.
-- -----------------------------------------------------------------------------
alter table public.cities
  add column if not exists tourism_region text;

do $$ begin
  alter table public.cities
    add constraint cities_tourism_region_chk check (
      tourism_region is null
      or tourism_region in (
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
        '13a', '13b', '13c'
      )
    );
exception
  when duplicate_object then null;
end $$;

comment on column public.cities.tourism_region is
  'Ontario tourism region code from the provincial Tourism regions dataset (e.g. ''5'' for Mississauga, ''3'' for Oakville). Null outside Ontario or until verified.';

commit;
