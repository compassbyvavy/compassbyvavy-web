-- Discover taxonomy (Phase 1). Structure only: the seed script loads the workbook.
--
-- public.place_types already means "types assigned to one place" (place_id +
-- a text label). The catalog of PT-… place types is discover_place_types so
-- that table is not replaced.

begin;

do $$ begin
  create type public.discover_catalog_status as enum ('live', 'coming_soon', 'parked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discover_type_status as enum ('Live', 'Parked', 'Merged');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.feature_applicability as enum ('C', '?');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_type as enum ('drop_in', 'book_ahead', 'register_season');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.collection_kind as enum ('hand_picked', 'automatic');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.school_system as enum (
    'english_public', 'english_catholic', 'french_public', 'french_catholic'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.school_day_kind as enum ('pa_day', 'holiday', 'winter_break', 'march_break');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_method as enum ('visited', 'phoned', 'emailed', 'website');
exception when duplicate_object then null;
end $$;

create table if not exists public.discover_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  sort_order integer not null,
  card_copy text not null default '',
  icon text,
  status public.discover_catalog_status not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.discover_subcategories (
  id text primary key,
  category_id text not null references public.discover_categories (id),
  slug text not null,
  name text not null,
  sort_order integer not null,
  description text not null default '',
  is_new boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint discover_subcategories_slug unique (category_id, slug)
);

create table if not exists public.discover_place_types (
  id text primary key,
  name text not null,
  discover_subcategory_id text references public.discover_subcategories (id),
  source_category text,
  source_subcategory text,
  indoor_outdoor text,
  permanent_seasonal text,
  primary_age_group text,
  discover_status public.discover_type_status not null,
  merged_into text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint discover_place_types_merged_chk check (
    (discover_status = 'Merged') = (merged_into is not null)
  )
);

create table if not exists public.place_type_features (
  place_type_id text not null references public.discover_place_types (id) on delete cascade,
  feature_id text not null,
  applicability public.feature_applicability not null,
  primary key (place_type_id, feature_id)
);

create table if not exists public.discover_filters (
  slug text primary key,
  label text not null,
  filter_group text not null,
  applies_to text[] not null default '{}',
  logic text not null default '',
  feature_ids text[] not null default '{}',
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.regions (
  id text primary key,
  name text not null,
  number text not null unique
);

create table if not exists public.collections (
  id text primary key,
  slug text not null,
  city text,
  title text not null,
  intro text not null default '',
  kind public.collection_kind not null,
  filter_query jsonb,
  season_start date,
  season_end date,
  home_rank integer,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collections_slug_city unique (slug, city)
);

create table if not exists public.collection_items (
  collection_id text not null references public.collections (id) on delete cascade,
  place_id text not null references public.places (id) on delete cascade,
  sort_order integer not null default 0,
  note text,
  primary key (collection_id, place_id)
);

create table if not exists public.occasions (
  slug text primary key,
  title text not null,
  filter_query jsonb not null default '{}'::jsonb,
  sort_order integer not null
);

create table if not exists public.school_boards (
  id text primary key,
  name text not null,
  system public.school_system not null,
  cities text[] not null default '{}',
  calendar_url text
);

create table if not exists public.school_calendar_days (
  board_id text not null references public.school_boards (id) on delete cascade,
  date date not null,
  kind public.school_day_kind not null,
  source_url text not null,
  checked_on date not null,
  primary key (board_id, date, kind)
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  verified_on date not null,
  method public.verification_method not null,
  by_name text,
  notes text
);

create table if not exists public.place_feature_values (
  place_id text not null references public.places (id) on delete cascade,
  feature_id text not null,
  value text not null,
  source text,
  verified_on date,
  primary key (place_id, feature_id)
);

-- GAP-009, GAP-010, GAP-012 and GAP-019. Weekly hours already live in
-- place_hours. age_min / age_max and latitude / longitude stay as they are.
alter table public.places
  add column if not exists primary_place_type_id text references public.discover_place_types (id),
  add column if not exists secondary_place_type_ids text[] not null default '{}',
  add column if not exists region_id text references public.regions (id),
  add column if not exists admission_child_cents integer,
  add column if not exists admission_adult_cents integer,
  add column if not exists admission_family_cents integer,
  add column if not exists free_entry boolean,
  add column if not exists min_age_months integer,
  add column if not exists max_age_years integer,
  add column if not exists season_start date,
  add column if not exists season_end date,
  add column if not exists registration_type public.registration_type,
  add column if not exists quiet_times text,
  add column if not exists weather_backup text,
  add column if not exists last_verified_on date,
  add column if not exists vavy_checked boolean not null default false;

alter table public.places
  drop constraint if exists places_admission_cents_chk;
alter table public.places
  add constraint places_admission_cents_chk check (
    (admission_child_cents is null or admission_child_cents >= 0)
    and (admission_adult_cents is null or admission_adult_cents >= 0)
    and (admission_family_cents is null or admission_family_cents >= 0)
  );

alter table public.places
  drop constraint if exists places_gap_age_chk;
alter table public.places
  add constraint places_gap_age_chk check (
    (min_age_months is null or min_age_months >= 0)
    and (max_age_years is null or max_age_years >= 0)
  );

comment on column public.places.primary_place_type_id is
  'One Discover place type. Set only when the workbook name matches exactly.';
comment on column public.places.free_entry is
  'Null means not confirmed. Never defaulted to free.';
comment on column public.places.vavy_checked is
  'True only after Vineeta has visited. Defaults to false.';

create index if not exists discover_place_types_status_idx
  on public.discover_place_types (discover_status);
create index if not exists places_primary_place_type_idx
  on public.places (primary_place_type_id);

-- Public catalog: Parked and Merged types are not in this view.
create or replace view public.discover_place_types_public
with (security_invoker = true) as
select *
from public.discover_place_types
where discover_status = 'Live';

grant select on public.discover_place_types_public to anon, authenticated;

alter table public.discover_categories enable row level security;
alter table public.discover_subcategories enable row level security;
alter table public.discover_place_types enable row level security;
alter table public.place_type_features enable row level security;
alter table public.discover_filters enable row level security;
alter table public.regions enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.occasions enable row level security;
alter table public.school_boards enable row level security;
alter table public.school_calendar_days enable row level security;
alter table public.verifications enable row level security;
alter table public.place_feature_values enable row level security;

drop policy if exists discover_categories_public_read on public.discover_categories;
create policy discover_categories_public_read
  on public.discover_categories for select to anon, authenticated
  using (status in ('live', 'coming_soon'));

drop policy if exists discover_subcategories_public_read on public.discover_subcategories;
create policy discover_subcategories_public_read
  on public.discover_subcategories for select to anon, authenticated
  using (
    exists (
      select 1 from public.discover_categories c
      where c.id = category_id and c.status in ('live', 'coming_soon')
    )
  );

drop policy if exists discover_place_types_public_read on public.discover_place_types;
create policy discover_place_types_public_read
  on public.discover_place_types for select to anon, authenticated
  using (discover_status = 'Live');

drop policy if exists place_type_features_public_read on public.place_type_features;
create policy place_type_features_public_read
  on public.place_type_features for select to anon, authenticated
  using (
    exists (
      select 1 from public.discover_place_types t
      where t.id = place_type_id and t.discover_status = 'Live'
    )
  );

drop policy if exists discover_filters_public_read on public.discover_filters;
create policy discover_filters_public_read
  on public.discover_filters for select to anon, authenticated
  using (status = 'Ready');

drop policy if exists regions_public_read on public.regions;
create policy regions_public_read
  on public.regions for select to anon, authenticated
  using (true);

drop policy if exists collections_public_read on public.collections;
create policy collections_public_read
  on public.collections for select to anon, authenticated
  using (published);

drop policy if exists collection_items_public_read on public.collection_items;
create policy collection_items_public_read
  on public.collection_items for select to anon, authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.published
    )
  );

drop policy if exists occasions_public_read on public.occasions;
create policy occasions_public_read
  on public.occasions for select to anon, authenticated
  using (true);

drop policy if exists school_boards_public_read on public.school_boards;
create policy school_boards_public_read
  on public.school_boards for select to anon, authenticated
  using (true);

drop policy if exists school_calendar_days_public_read on public.school_calendar_days;
create policy school_calendar_days_public_read
  on public.school_calendar_days for select to anon, authenticated
  using (true);

-- Visit notes stay off the public API. The place row carries last_verified_on.
drop policy if exists verifications_public_read on public.verifications;

drop policy if exists place_feature_values_public_read on public.place_feature_values;
create policy place_feature_values_public_read
  on public.place_feature_values for select to anon, authenticated
  using (verified_on is not null);

grant select on public.discover_categories to anon, authenticated;
grant select on public.discover_subcategories to anon, authenticated;
grant select on public.discover_place_types to anon, authenticated;
grant select on public.place_type_features to anon, authenticated;
grant select on public.discover_filters to anon, authenticated;
grant select on public.regions to anon, authenticated;
grant select on public.collections to anon, authenticated;
grant select on public.collection_items to anon, authenticated;
grant select on public.occasions to anon, authenticated;
grant select on public.school_boards to anon, authenticated;
grant select on public.school_calendar_days to anon, authenticated;
grant select on public.place_feature_values to anon, authenticated;

commit;
