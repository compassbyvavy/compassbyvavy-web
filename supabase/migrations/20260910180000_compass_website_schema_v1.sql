-- =============================================================================
-- Compass website schema v1
-- Target project: compassbyvavydev (jjnkcgjcdffzgxczsqrk)
-- Empty structure only. Do not seed. Do not auto-publish from workbook Add.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums (idempotent; duplicate_object is a no-op on re-apply)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.research_status as enum (
    'not_started',
    'in_progress',
    'complete',
    'blocked',
    'skipped'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.publication_state as enum (
    'draft',
    'published',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.confirmed_tri_state as enum (
    'yes',
    'no',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.discover_category as enum (
    'parks_nature',
    'splash_pads',
    'indoor_play',
    'events',
    'classes',
    'camps',
    'food_treats',
    'getaways',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.price_unit as enum (
    'per_day',
    'per_week',
    'full_program',
    'per_session',
    'other',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_currency as enum (
    'CAD',
    'USD',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_registration_status as enum (
    'registration_open',
    'registration_closed',
    'no_upcoming_dates',
    'waitlist',
    'not_yet_open',
    'availability_unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.seat_availability_fact as enum (
    'unknown',
    'confirmed_available',
    'confirmed_full'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_session_schedule_format as enum (
    'full_day',
    'half_day',
    'short_session',
    'single_day',
    'weekly',
    'multiweek',
    'other',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_stay_type as enum (
    'day',
    'overnight',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_delivery_mode as enum (
    'in_person',
    'online',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_audience as enum (
    'child_only',
    'parent_and_child',
    'family',
    'other',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.camp_age_assessment_rule as enum (
    'as_of_date',
    'as_of_session_start',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.inspection_decision as enum (
    'inspect',
    'needs_review',
    'add',
    'skip'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.submission_kind as enum (
    'waitlist',
    'missing_camp',
    'correction',
    'general'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.submission_status as enum (
    'received',
    'in_review',
    'resolved',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Updated-at trigger function
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Website schema v1: sets updated_at to UTC now() on row update.';

-- -----------------------------------------------------------------------------
-- cities
-- -----------------------------------------------------------------------------
create table if not exists public.cities (
  id text primary key,
  country text not null,
  province_state text not null,
  city_town text not null,
  slug text unique,
  research_status public.research_status not null default 'not_started',
  research_notes text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cities_country_province_city_key unique (country, province_state, city_town)
);

comment on table public.cities is
  'Launch / research localities. Publicly readable. Not a publication-gated catalog table.';

-- -----------------------------------------------------------------------------
-- providers (Camp Research Master Providers sheet fields + publication)
-- -----------------------------------------------------------------------------
create table if not exists public.providers (
  id text primary key,
  name text not null,
  legal_name text,
  website_url text,
  registration_info_url text,
  contact_email text,
  contact_phone text,
  city_id text references public.cities (id) on delete set null,
  organization_type text,
  facebook_url text,
  instagram_url text,
  research_status public.research_status not null default 'not_started',
  research_notes text,
  source_url text,
  source_checked_date date,
  last_researched_at timestamptz,
  provider_confirmed boolean,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.providers is
  'Organizations offering programs. Research columns follow the Camp Research Master Providers sheet. published_at stays null until an explicit human publish.';

create index if not exists providers_city_id_idx on public.providers (city_id);
create index if not exists providers_publication_idx
  on public.providers (publication_state, published_at);

-- -----------------------------------------------------------------------------
-- venues
-- -----------------------------------------------------------------------------
create table if not exists public.venues (
  id text primary key,
  name text not null,
  neighbourhood text,
  address_line text,
  city_id text references public.cities (id) on delete set null,
  postal_code text,
  latitude double precision,
  longitude double precision,
  notes text,
  wheelchair_accessible public.confirmed_tri_state not null default 'unknown',
  stroller_friendly public.confirmed_tri_state not null default 'unknown',
  washrooms_available public.confirmed_tri_state not null default 'unknown',
  change_table public.confirmed_tri_state not null default 'unknown',
  accessible_parking public.confirmed_tri_state not null default 'unknown',
  sensory_friendly public.confirmed_tri_state not null default 'unknown',
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venues_latitude_chk check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint venues_longitude_chk check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  )
);

comment on table public.venues is
  'Physical or online locations referenced by sessions and places. lat/lng nullable until verified.';

create index if not exists venues_city_id_idx on public.venues (city_id);
create index if not exists venues_publication_idx
  on public.venues (publication_state, published_at);

-- -----------------------------------------------------------------------------
-- Leftover public.places repair (fixes prior ERROR 42703 on category/published_at)
-- Drop empty tables that lack column category. Refuse if non-empty without it.
-- -----------------------------------------------------------------------------
do $$
declare
  has_places boolean;
  has_category boolean;
  place_count bigint;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'places'
  ) into has_places;

  if not has_places then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'places'
      and column_name = 'category'
  ) into has_category;

  if has_category then
    return;
  end if;

  execute 'select count(*) from public.places' into place_count;

  if place_count = 0 then
    drop table public.places cascade;
  else
    raise exception
      'public.places exists with % row(s) and no category column; refusing to drop non-empty leftover table',
      place_count;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- places
-- -----------------------------------------------------------------------------
create table if not exists public.places (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  category public.discover_category not null,
  city_id text references public.cities (id) on delete set null,
  venue_id text references public.venues (id) on delete set null,
  address_line text,
  neighbourhood text,
  website_url text,
  image_src text,
  image_alt text,
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint places_age_min_chk check (age_min is null or age_min >= 0),
  constraint places_age_max_chk check (age_max is null or age_max >= 0),
  constraint places_age_range_chk check (
    age_min is null or age_max is null or age_min <= age_max
  )
);

comment on table public.places is
  'Discover places (parks, splash pads, indoor play, food, getaways, other). category is required. Never published by workbook import.';

-- Places indexes only after confirming category / published_at exist (ERROR 42703 guard).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'places'
      and column_name = 'category'
  ) then
    execute 'create index if not exists places_category_idx on public.places (category)';
    execute 'create index if not exists places_city_id_idx on public.places (city_id)';
    execute 'create index if not exists places_venue_id_idx on public.places (venue_id)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'places'
      and column_name = 'published_at'
  ) then
    execute 'create index if not exists places_published_at_idx on public.places (published_at)';
    execute $idx$
      create index if not exists places_published_live_idx
        on public.places (category, published_at)
        where publication_state = 'published' and published_at is not null
    $idx$;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  category public.discover_category not null default 'events',
  city_id text references public.cities (id) on delete set null,
  venue_id text references public.venues (id) on delete set null,
  place_id text references public.places (id) on delete set null,
  start_at timestamptz,
  end_at timestamptz,
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  price_amount numeric,
  price_unit public.price_unit,
  currency public.camp_currency,
  website_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_age_min_chk check (age_min is null or age_min >= 0),
  constraint events_age_max_chk check (age_max is null or age_max >= 0),
  constraint events_age_range_chk check (
    age_min is null or age_max is null or age_min <= age_max
  ),
  constraint events_when_chk check (
    start_at is null or end_at is null or start_at <= end_at
  )
);

create index if not exists events_city_id_idx on public.events (city_id);
create index if not exists events_venue_id_idx on public.events (venue_id);
create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_publication_idx
  on public.events (publication_state, published_at);

-- -----------------------------------------------------------------------------
-- class_programs / class_sessions
-- -----------------------------------------------------------------------------
create table if not exists public.class_programs (
  id text primary key,
  slug text not null unique,
  provider_id text not null references public.providers (id) on delete restrict,
  name text not null,
  description text,
  primary_category text,
  secondary_themes text[] not null default '{}',
  typical_age_min integer,
  typical_age_max integer,
  typical_age_min_inclusive boolean,
  typical_age_max_inclusive boolean,
  audience public.camp_audience,
  accessibility_support_tags text[] not null default '{}',
  image_src text,
  image_alt text,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint class_programs_typical_age_min_chk check (
    typical_age_min is null or typical_age_min >= 0
  ),
  constraint class_programs_typical_age_max_chk check (
    typical_age_max is null or typical_age_max >= 0
  ),
  constraint class_programs_typical_age_range_chk check (
    typical_age_min is null
    or typical_age_max is null
    or typical_age_min <= typical_age_max
  )
);

create index if not exists class_programs_provider_id_idx
  on public.class_programs (provider_id);
create index if not exists class_programs_publication_idx
  on public.class_programs (publication_state, published_at);

create table if not exists public.class_sessions (
  id text primary key,
  program_id text not null references public.class_programs (id) on delete cascade,
  venue_id text references public.venues (id) on delete set null,
  start_date date,
  end_date date,
  schedule_format public.camp_session_schedule_format,
  delivery_mode public.camp_delivery_mode,
  core_hours_start time,
  core_hours_end time,
  price_amount numeric,
  price_unit public.price_unit,
  currency public.camp_currency,
  fee_notes text,
  registration_status public.camp_registration_status not null default 'availability_unknown',
  registration_opens_on date,
  waitlist_url text,
  registration_url text,
  source_url text,
  source_checked_date date,
  provider_confirmed boolean,
  seat_availability public.seat_availability_fact not null default 'unknown',
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  age_assessed_at_date date,
  age_assessment_rule public.camp_age_assessment_rule,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint class_sessions_dates_chk check (
    start_date is null or end_date is null or start_date <= end_date
  ),
  constraint class_sessions_age_min_chk check (age_min is null or age_min >= 0),
  constraint class_sessions_age_max_chk check (age_max is null or age_max >= 0),
  constraint class_sessions_age_range_chk check (
    age_min is null or age_max is null or age_min <= age_max
  )
);

create index if not exists class_sessions_program_id_idx
  on public.class_sessions (program_id);
create index if not exists class_sessions_venue_id_idx
  on public.class_sessions (venue_id);
create index if not exists class_sessions_start_date_idx
  on public.class_sessions (start_date);
create index if not exists class_sessions_publication_idx
  on public.class_sessions (publication_state, published_at);

-- -----------------------------------------------------------------------------
-- camp_programs / camp_sessions / camp_packing_items
-- -----------------------------------------------------------------------------
create table if not exists public.camp_programs (
  id text primary key,
  slug text not null unique,
  provider_id text not null references public.providers (id) on delete restrict,
  name text not null,
  description text,
  primary_category text,
  secondary_themes text[] not null default '{}',
  typical_age_min integer,
  typical_age_max integer,
  typical_age_min_inclusive boolean,
  typical_age_max_inclusive boolean,
  typical_age_assessed_at_date date,
  audience public.camp_audience,
  accessibility_support_tags text[] not null default '{}',
  image_src text,
  image_alt text,
  experience_summary text,
  prerequisites text[],
  support_info text,
  policies_summary text,
  preparation_notes text,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint camp_programs_typical_age_min_chk check (
    typical_age_min is null or typical_age_min >= 0
  ),
  constraint camp_programs_typical_age_max_chk check (
    typical_age_max is null or typical_age_max >= 0
  ),
  constraint camp_programs_typical_age_range_chk check (
    typical_age_min is null
    or typical_age_max is null
    or typical_age_min <= typical_age_max
  )
);

comment on table public.camp_programs is
  'Stable camp program identity. Typical ages are descriptive only — exact eligibility lives on camp_sessions.';

create index if not exists camp_programs_provider_id_idx
  on public.camp_programs (provider_id);
create index if not exists camp_programs_publication_idx
  on public.camp_programs (publication_state, published_at);

create table if not exists public.camp_sessions (
  id text primary key,
  program_id text not null references public.camp_programs (id) on delete cascade,
  venue_id text references public.venues (id) on delete set null,
  start_date date,
  end_date date,
  timing_label text,
  schedule_format public.camp_session_schedule_format,
  stay_type public.camp_stay_type,
  delivery_mode public.camp_delivery_mode,
  core_hours_start time,
  core_hours_end time,
  before_care_offered public.confirmed_tri_state not null default 'unknown',
  before_care_start_time time,
  before_care_end_time time,
  before_care_separate_booking public.confirmed_tri_state not null default 'unknown',
  after_care_offered public.confirmed_tri_state not null default 'unknown',
  after_care_start_time time,
  after_care_end_time time,
  after_care_separate_booking public.confirmed_tri_state not null default 'unknown',
  price_amount numeric,
  price_unit public.price_unit,
  currency public.camp_currency,
  fee_notes text,
  registration_status public.camp_registration_status not null default 'availability_unknown',
  registration_opens_on date,
  waitlist_url text,
  registration_url text,
  source_url text,
  source_checked_date date,
  provider_confirmed boolean,
  seat_availability public.seat_availability_fact not null default 'unknown',
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  age_assessed_at_date date,
  age_assessment_rule public.camp_age_assessment_rule,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint camp_sessions_dates_chk check (
    start_date is null or end_date is null or start_date <= end_date
  ),
  constraint camp_sessions_age_min_chk check (age_min is null or age_min >= 0),
  constraint camp_sessions_age_max_chk check (age_max is null or age_max >= 0),
  constraint camp_sessions_age_range_chk check (
    age_min is null or age_max is null or age_min <= age_max
  )
);

comment on table public.camp_sessions is
  'Dated camp offering. registration_status is lifecycle only; seat_availability is capacity only. Age assessment fields are session-owned.';

comment on column public.camp_sessions.registration_status is
  'Registration lifecycle. Independent of seat_availability.';

comment on column public.camp_sessions.seat_availability is
  'Capacity fact only. unknown is not available. Do not store registration closure here.';

create index if not exists camp_sessions_program_id_idx
  on public.camp_sessions (program_id);
create index if not exists camp_sessions_venue_id_idx
  on public.camp_sessions (venue_id);
create index if not exists camp_sessions_start_date_idx
  on public.camp_sessions (start_date);
create index if not exists camp_sessions_registration_status_idx
  on public.camp_sessions (registration_status);
create index if not exists camp_sessions_publication_idx
  on public.camp_sessions (publication_state, published_at);

create table if not exists public.camp_packing_items (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.camp_programs (id) on delete cascade,
  body text not null,
  kind text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint camp_packing_items_kind_chk check (kind in ('required', 'suggested'))
);

comment on table public.camp_packing_items is
  'What to bring. required vs suggested must stay distinct.';

create index if not exists camp_packing_items_program_id_idx
  on public.camp_packing_items (program_id, sort_order);

-- -----------------------------------------------------------------------------
-- camp_research_candidates (private staging; never public)
-- -----------------------------------------------------------------------------
create table if not exists public.camp_research_candidates (
  candidate_id text primary key,
  organization_name text,
  program_name text,
  website_url text,
  city_town text,
  province_state text,
  source_url text,
  source_sheet text,
  source_row integer,
  inspection_decision public.inspection_decision,
  inspection_notes text,
  mapped_provider_id text references public.providers (id) on delete set null,
  mapped_program_id text references public.camp_programs (id) on delete set null,
  mapped_venue_id text references public.venues (id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  researched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.camp_research_candidates is
  'Private research staging from the Camp Research Master workbook. inspection_decision = add does not publish. No anon/authenticated policies.';

create index if not exists camp_research_candidates_decision_idx
  on public.camp_research_candidates (inspection_decision);

-- -----------------------------------------------------------------------------
-- site_submissions
-- -----------------------------------------------------------------------------
create table if not exists public.site_submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  status public.submission_status not null default 'received',
  user_id uuid references auth.users (id) on delete set null,
  email text,
  display_name text,
  message text,
  related_entity_type text,
  related_entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_submissions is
  'Waitlist, missing-camp, correction, and general public submissions. Insert-only for anon and authenticated.';

create index if not exists site_submissions_kind_status_idx
  on public.site_submissions (kind, status);
create index if not exists site_submissions_created_at_idx
  on public.site_submissions (created_at);

-- -----------------------------------------------------------------------------
-- profiles / family_children / saved_items / plan_entries
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  home_city_id text references public.cities (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text,
  birth_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists family_children_user_id_idx
  on public.family_children (user_id);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_kind text not null,
  item_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_items_kind_chk check (
    item_kind in (
      'place',
      'event',
      'class_program',
      'class_session',
      'camp_program',
      'camp_session'
    )
  ),
  constraint saved_items_user_item_key unique (user_id, item_kind, item_id)
);

create index if not exists saved_items_user_id_idx on public.saved_items (user_id);

create table if not exists public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.family_children (id) on delete set null,
  entry_date date not null,
  item_kind text,
  item_id text,
  title text,
  notes text,
  start_time time,
  end_time time,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint plan_entries_kind_chk check (
    item_kind is null
    or item_kind in (
      'place',
      'event',
      'class_program',
      'class_session',
      'camp_program',
      'camp_session'
    )
  )
);

create index if not exists plan_entries_user_date_idx
  on public.plan_entries (user_id, entry_date);

-- -----------------------------------------------------------------------------
-- updated_at triggers on mutable tables
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'cities',
    'providers',
    'venues',
    'places',
    'events',
    'class_programs',
    'class_sessions',
    'camp_programs',
    'camp_sessions',
    'camp_packing_items',
    'camp_research_candidates',
    'site_submissions',
    'profiles',
    'family_children',
    'saved_items',
    'plan_entries'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke all on table public.cities from anon, authenticated;
revoke all on table public.providers from anon, authenticated;
revoke all on table public.venues from anon, authenticated;
revoke all on table public.places from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.class_programs from anon, authenticated;
revoke all on table public.class_sessions from anon, authenticated;
revoke all on table public.camp_programs from anon, authenticated;
revoke all on table public.camp_sessions from anon, authenticated;
revoke all on table public.camp_packing_items from anon, authenticated;
revoke all on table public.camp_research_candidates from anon, authenticated, public;
revoke all on table public.site_submissions from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.family_children from anon, authenticated;
revoke all on table public.saved_items from anon, authenticated;
revoke all on table public.plan_entries from anon, authenticated;

grant select on table public.cities to anon, authenticated;
grant select on table public.providers to anon, authenticated;
grant select on table public.venues to anon, authenticated;
grant select on table public.places to anon, authenticated;
grant select on table public.events to anon, authenticated;
grant select on table public.class_programs to anon, authenticated;
grant select on table public.class_sessions to anon, authenticated;
grant select on table public.camp_programs to anon, authenticated;
grant select on table public.camp_sessions to anon, authenticated;
grant select on table public.camp_packing_items to anon, authenticated;

grant insert on table public.site_submissions to anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.family_children to authenticated;
grant select, insert, update, delete on table public.saved_items to authenticated;
grant select, insert, update, delete on table public.plan_entries to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.providers enable row level security;
alter table public.venues enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.class_programs enable row level security;
alter table public.class_sessions enable row level security;
alter table public.camp_programs enable row level security;
alter table public.camp_sessions enable row level security;
alter table public.camp_packing_items enable row level security;
alter table public.camp_research_candidates enable row level security;
alter table public.site_submissions enable row level security;
alter table public.profiles enable row level security;
alter table public.family_children enable row level security;
alter table public.saved_items enable row level security;
alter table public.plan_entries enable row level security;

drop policy if exists cities_public_read on public.cities;
create policy cities_public_read
  on public.cities
  for select
  to anon, authenticated
  using (true);

drop policy if exists providers_public_read on public.providers;
create policy providers_public_read
  on public.providers
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists venues_public_read on public.venues;
create policy venues_public_read
  on public.venues
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists places_public_read on public.places;
create policy places_public_read
  on public.places
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists events_public_read on public.events;
create policy events_public_read
  on public.events
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists class_programs_public_read on public.class_programs;
create policy class_programs_public_read
  on public.class_programs
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists class_sessions_public_read on public.class_sessions;
create policy class_sessions_public_read
  on public.class_sessions
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists camp_programs_public_read on public.camp_programs;
create policy camp_programs_public_read
  on public.camp_programs
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists camp_sessions_public_read on public.camp_sessions;
create policy camp_sessions_public_read
  on public.camp_sessions
  for select
  to anon, authenticated
  using (
    published_at is not null
    and publication_state = 'published'::public.publication_state
  );

drop policy if exists camp_packing_public_read on public.camp_packing_items;
create policy camp_packing_public_read
  on public.camp_packing_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.camp_programs p
      where p.id = camp_packing_items.program_id
        and p.published_at is not null
        and p.publication_state = 'published'::public.publication_state
    )
  );

drop policy if exists site_submissions_anon_insert on public.site_submissions;
create policy site_submissions_anon_insert
  on public.site_submissions
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = (select auth.uid())
  );

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all
  on public.profiles
  for all
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists family_children_owner_all on public.family_children;
create policy family_children_owner_all
  on public.family_children
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists saved_items_owner_all on public.saved_items;
create policy saved_items_owner_all
  on public.saved_items
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists plan_entries_owner_all on public.plan_entries;
create policy plan_entries_owner_all
  on public.plan_entries
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
