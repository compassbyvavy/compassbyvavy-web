-- Compass by Vavy — website schema (v1)
-- Target: compassbyvavydev (jjnkcgjcdffzgxczsqrk)
-- Intent: empty structure only. No seed/publish. Public read only where published_at IS NOT NULL.
-- Domains: discover places, events, classes, camps, waitlist, corrections, city coverage,
--          research staging, and auth-ready family profile scaffolding.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.research_status as enum (
    'not_started','needs_verification','in_progress','verified','paused','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publication_state as enum (
    'draft','approved','published','unpublished','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.confirmed_tri_state as enum ('yes','no','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discover_category as enum (
    'parks_nature','splash_pads','indoor_play','events','classes','camps',
    'food_treats','getaways','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.price_unit as enum (
    'per_day','per_week','full_program','per_session','per_visit','free','other','unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_currency as enum ('CAD','USD','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_registration_status as enum (
    'registration_open','registration_closed','no_upcoming_dates',
    'waitlist','not_yet_open','availability_unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.seat_availability_fact as enum (
    'unknown','confirmed_available','confirmed_full'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_session_schedule_format as enum (
    'full_day','half_day','short_session','single_day','weekly','multiweek','other','unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_stay_type as enum ('day','overnight','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_delivery_mode as enum ('in_person','online','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_audience as enum (
    'child_only','parent_and_child','family','other','unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.camp_age_assessment_rule as enum (
    'as_of_date','as_of_session_start','unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inspection_decision as enum (
    'inspect','needs_review','add','skip'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_kind as enum (
    'waitlist','missing_camp','correction','general'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum (
    'new','in_review','resolved','rejected'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Geography / coverage
-- ---------------------------------------------------------------------------
create table if not exists public.cities (
  id text primary key,
  country text not null default 'Canada',
  province_state text not null,
  region_county text,
  city_town text not null,
  priority text,
  research_status public.research_status not null default 'not_started',
  target_place_count integer,
  notes text,
  last_research_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country, province_state, city_town)
);

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Providers (shared across camps/classes/events where useful)
-- ---------------------------------------------------------------------------
create table if not exists public.providers (
  id text primary key,
  name text not null,
  provider_type text,
  country text not null default 'Canada',
  province_state text,
  primary_city_town text,
  service_area text,
  website_url text,
  registration_portal_url text,
  contact_name text,
  contact_email text,
  phone text,
  social_media text,
  accreditation text,
  faith_cultural_affiliation text,
  languages text[],
  inclusion_support text,
  research_status public.research_status not null default 'needs_verification',
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
create table if not exists public.venues (
  id text primary key,
  name text not null,
  venue_type text,
  country text not null default 'Canada',
  province_state text,
  region_county text,
  city_town text,
  neighbourhood text,
  address_line text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  indoor_outdoor text,
  wheelchair_accessible public.confirmed_tri_state not null default 'unknown',
  washrooms public.confirmed_tri_state not null default 'unknown',
  parking public.confirmed_tri_state not null default 'unknown',
  transit_access public.confirmed_tri_state not null default 'unknown',
  dropoff_notes text,
  accessibility_notes text,
  website_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Discover places (parks, splash, indoor play, food, getaways, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.places (
  id text primary key,
  slug text not null unique,
  name text not null,
  category public.discover_category not null,
  provider_id text references public.providers(id) on delete set null,
  primary_venue_id text references public.venues(id) on delete set null,
  city_id text references public.cities(id) on delete set null,
  short_description text,
  long_description text,
  age_min integer,
  age_max integer,
  price_amount numeric(12,2),
  price_unit public.price_unit not null default 'unknown',
  currency public.camp_currency not null default 'CAD',
  fee_notes text,
  tags text[] not null default '{}',
  accessibility_tags text[] not null default '{}',
  image_url text,
  image_alt text,
  official_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_age_ok check (
    age_min is null or age_min >= 0
  ),
  constraint places_age_span_ok check (
    age_max is null or age_min is null or age_max >= age_min
  )
);

create index if not exists places_category_idx on public.places (category);
create index if not exists places_published_idx on public.places (published_at)
  where published_at is not null;

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
before update on public.places
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id text primary key,
  slug text not null unique,
  name text not null,
  provider_id text references public.providers(id) on delete set null,
  venue_id text references public.venues(id) on delete set null,
  city_id text references public.cities(id) on delete set null,
  short_description text,
  long_description text,
  starts_at timestamptz,
  ends_at timestamptz,
  timing_label text,
  age_min integer,
  age_max integer,
  price_amount numeric(12,2),
  price_unit public.price_unit not null default 'unknown',
  currency public.camp_currency not null default 'CAD',
  fee_notes text,
  tags text[] not null default '{}',
  official_url text,
  registration_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_idx on public.events (starts_at);
create index if not exists events_published_idx on public.events (published_at)
  where published_at is not null;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Classes (recurring programs; sessions optional later)
-- ---------------------------------------------------------------------------
create table if not exists public.class_programs (
  id text primary key,
  slug text not null unique,
  name text not null,
  provider_id text not null references public.providers(id) on delete restrict,
  primary_venue_id text references public.venues(id) on delete set null,
  city_id text references public.cities(id) on delete set null,
  primary_category text,
  secondary_themes text[] not null default '{}',
  short_description text,
  long_description text,
  typical_age_min integer,
  typical_age_max integer,
  audience public.camp_audience not null default 'unknown',
  accessibility_support_tags text[] not null default '{}',
  image_url text,
  image_alt text,
  official_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_sessions (
  id text primary key,
  program_id text not null references public.class_programs(id) on delete cascade,
  venue_id text references public.venues(id) on delete set null,
  name text,
  start_date date,
  end_date date,
  days_of_week text[],
  start_time time,
  end_time time,
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  price_amount numeric(12,2),
  price_unit public.price_unit not null default 'unknown',
  currency public.camp_currency not null default 'CAD',
  fee_notes text,
  registration_status public.camp_registration_status not null default 'availability_unknown',
  registration_url text,
  source_url text,
  source_checked_date date,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_sessions_program_idx on public.class_sessions (program_id);

drop trigger if exists class_programs_set_updated_at on public.class_programs;
create trigger class_programs_set_updated_at
before update on public.class_programs
for each row execute function public.set_updated_at();

drop trigger if exists class_sessions_set_updated_at on public.class_sessions;
create trigger class_sessions_set_updated_at
before update on public.class_sessions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Camps (Provider → Program → Session → Venue)
-- ---------------------------------------------------------------------------
create table if not exists public.camp_programs (
  id text primary key,
  slug text not null unique,
  name text not null,
  provider_id text not null references public.providers(id) on delete restrict,
  primary_venue_id text references public.venues(id) on delete set null,
  city_id text references public.cities(id) on delete set null,
  neighbourhood text,
  primary_category text,
  secondary_themes text[] not null default '{}',
  typical_delivery_model text,
  typical_seasons text[],
  typical_age_min integer,
  typical_age_max integer,
  typical_age_min_inclusive boolean,
  typical_age_max_inclusive boolean,
  typical_age_assessed_at_date date,
  default_audience public.camp_audience not null default 'unknown',
  skill_level text,
  indoor_outdoor text,
  languages text[],
  prerequisites text[],
  short_description text,
  parent_highlights text,
  best_for text,
  experience_summary text,
  support_info text,
  policies_summary text,
  preparation_notes text,
  typical_price_from numeric(12,2),
  currency public.camp_currency not null default 'CAD',
  price_unit public.price_unit not null default 'unknown',
  subsidy_financial_aid public.confirmed_tri_state not null default 'unknown',
  before_care public.confirmed_tri_state not null default 'unknown',
  after_care public.confirmed_tri_state not null default 'unknown',
  transportation_busing public.confirmed_tri_state not null default 'unknown',
  meals_snacks public.confirmed_tri_state not null default 'unknown',
  registration_website text,
  main_source_url text,
  source_type text,
  source_confidence text,
  image_url text,
  image_alt text,
  accessibility_support_tags text[] not null default '{}',
  research_status public.research_status not null default 'needs_verification',
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.camp_sessions (
  id text primary key,
  program_id text not null references public.camp_programs(id) on delete cascade,
  venue_id text references public.venues(id) on delete set null,
  session_name text,
  session_period text,
  year integer,
  start_date date,
  end_date date,
  days_of_week text[],
  start_time time,
  end_time time,
  timing_label text,
  schedule_format public.camp_session_schedule_format not null default 'unknown',
  stay_type public.camp_stay_type not null default 'unknown',
  delivery_mode public.camp_delivery_mode not null default 'unknown',
  core_hours_start time,
  core_hours_end time,
  age_min integer,
  age_max integer,
  age_min_inclusive boolean,
  age_max_inclusive boolean,
  age_assessed_at_date date,
  age_assessment_rule public.camp_age_assessment_rule not null default 'unknown',
  audience public.camp_audience not null default 'unknown',
  accessibility_support text,
  city_town text,
  price_amount numeric(12,2),
  currency public.camp_currency not null default 'CAD',
  price_unit public.price_unit not null default 'unknown',
  tax_included public.confirmed_tri_state not null default 'unknown',
  registration_fee numeric(12,2),
  fee_notes text,
  before_care_available public.confirmed_tri_state not null default 'unknown',
  before_care_fee numeric(12,2),
  before_care_start time,
  before_care_end time,
  before_care_separate_booking public.confirmed_tri_state not null default 'unknown',
  after_care_available public.confirmed_tri_state not null default 'unknown',
  after_care_fee numeric(12,2),
  after_care_start time,
  after_care_end time,
  after_care_separate_booking public.confirmed_tri_state not null default 'unknown',
  financial_aid public.confirmed_tri_state not null default 'unknown',
  transportation_available public.confirmed_tri_state not null default 'unknown',
  registration_open_date date,
  registration_close_date date,
  registration_status public.camp_registration_status not null default 'availability_unknown',
  registration_opens_on date,
  waitlist_url text,
  registration_url text,
  capacity integer,
  seat_availability public.seat_availability_fact not null default 'unknown',
  source_url text,
  source_checked_date date,
  provider_confirmed boolean,
  notes text,
  publication_state public.publication_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists camp_sessions_program_idx on public.camp_sessions (program_id);
create index if not exists camp_sessions_dates_idx on public.camp_sessions (start_date, end_date);
create index if not exists camp_programs_published_idx on public.camp_programs (published_at)
  where published_at is not null;
create index if not exists camp_sessions_published_idx on public.camp_sessions (published_at)
  where published_at is not null;

drop trigger if exists camp_programs_set_updated_at on public.camp_programs;
create trigger camp_programs_set_updated_at
before update on public.camp_programs
for each row execute function public.set_updated_at();

drop trigger if exists camp_sessions_set_updated_at on public.camp_sessions;
create trigger camp_sessions_set_updated_at
before update on public.camp_sessions
for each row execute function public.set_updated_at();

create table if not exists public.camp_packing_items (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.camp_programs(id) on delete cascade,
  text text not null,
  kind text not null check (kind in ('required','suggested')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Research staging (private) — Mississauga Candidates etc.
-- ---------------------------------------------------------------------------
create table if not exists public.camp_research_candidates (
  candidate_id text primary key,
  inspection_decision public.inspection_decision not null default 'inspect',
  evidence_tier text,
  provider_name text,
  camp_program_name text,
  primary_category text,
  secondary_themes text,
  session_periods text,
  format_duration text,
  age_grade_evidence text,
  audience text,
  accessibility_support text,
  venue_area text,
  address_location_evidence text,
  current_recurring_evidence text,
  official_camp_url text,
  location_secondary_url text,
  research_notes text,
  last_checked date,
  inspector_notes text,
  source_workbook_hash text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists camp_research_candidates_set_updated_at on public.camp_research_candidates;
create trigger camp_research_candidates_set_updated_at
before update on public.camp_research_candidates
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Site submissions (waitlist, corrections, missing camps)
-- ---------------------------------------------------------------------------
create table if not exists public.site_submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  status public.submission_status not null default 'new',
  email text,
  name text,
  message text,
  camp_or_provider_name text,
  official_url text,
  city_town text,
  related_public_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_submissions_set_updated_at on public.site_submissions;
create trigger site_submissions_set_updated_at
before update on public.site_submissions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth-ready family layer (private; empty until Auth is used)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_city_id text references public.cities(id) on delete set null,
  preferred_budget_amount numeric(12,2),
  preferred_budget_unit public.price_unit,
  preferred_area_label text,
  preferred_radius_km numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.family_children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null,
  interests text[] not null default '{}',
  age_as_of_years integer,
  age_as_of_date date,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists family_children_set_updated_at on public.family_children;
create trigger family_children_set_updated_at
before update on public.family_children
for each row execute function public.set_updated_at();

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_kind text not null check (item_kind in ('place','event','class_program','class_session','camp_program','camp_session')),
  item_id text not null,
  session_id text,
  marked_registered boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, item_kind, item_id, session_id)
);

drop trigger if exists saved_items_set_updated_at on public.saved_items;
create trigger saved_items_set_updated_at
before update on public.saved_items
for each row execute function public.set_updated_at();

create table if not exists public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid references public.family_children(id) on delete set null,
  guest_label text,
  item_kind text not null check (item_kind in ('camp_session','class_session','event','place')),
  item_id text not null,
  status text not null default 'tentative' check (status in ('tentative','planned','marked_registered','past')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists plan_entries_set_updated_at on public.plan_entries;
create trigger plan_entries_set_updated_at
before update on public.plan_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
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

-- Public read for published directory rows only (no drafts)
create policy cities_public_read on public.cities for select to anon, authenticated using (true);

create policy providers_public_read on public.providers for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy venues_public_read on public.venues for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy places_public_read on public.places for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy events_public_read on public.events for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy class_programs_public_read on public.class_programs for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy class_sessions_public_read on public.class_sessions for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy camp_programs_public_read on public.camp_programs for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy camp_sessions_public_read on public.camp_sessions for select to anon, authenticated
  using (published_at is not null and publication_state = 'published');
create policy camp_packing_public_read on public.camp_packing_items for select to anon, authenticated
  using (exists (
    select 1 from public.camp_programs p
    where p.id = program_id
      and p.published_at is not null
      and p.publication_state = 'published'
  ));

-- Anyone can submit waitlist/correction forms; nobody public can read the queue
create policy site_submissions_anon_insert on public.site_submissions
  for insert to anon, authenticated
  with check (true);

-- Private family tables: owner only
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy family_children_owner_all on public.family_children
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy saved_items_owner_all on public.saved_items
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy plan_entries_owner_all on public.plan_entries
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Research candidates: no anon/authenticated policies ⇒ denied by default with RLS on
-- (service role / dashboard still has access)

commit;
