-- Launch shell structure. Adds taxonomy, the listings switch, and the waitlist.
-- Does not alter camp, place, or venue rows.

begin;

create table if not exists public.site_settings (
  id text primary key,
  listings_live boolean not null default false,
  launch_date date,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, listings_live, launch_date)
values ('default', false, date '2027-01-01')
on conflict (id) do nothing;

create table if not exists public.discover_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  sort_order integer not null,
  card_copy text,
  icon text,
  status text not null check (status in ('live', 'coming_soon', 'parked')),
  page_title text
);

create table if not exists public.discover_subcategories (
  id text primary key,
  category_id text not null references public.discover_categories (id),
  slug text not null,
  name text not null,
  sort_order integer not null,
  description text,
  is_new boolean not null default false,
  chip_row text check (chip_row in ('when', 'type')),
  in_season_months text,
  seasonal_only boolean not null default false,
  page_title text,
  unique (category_id, slug)
);

-- Catalog of place types from the workbook. Distinct from public.place_types,
-- which stores the types assigned to an existing place and is left untouched.
create table if not exists public.discover_place_types (
  id text primary key,
  name text not null,
  discover_subcategory_id text references public.discover_subcategories (id),
  source_category text,
  source_subcategory text,
  indoor_outdoor text,
  permanent_seasonal text,
  primary_age_group text,
  discover_status text not null check (discover_status in ('Live', 'Parked', 'Merged')),
  merged_into text
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source_page text,
  category text,
  subcategory text,
  city text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  constraint waitlist_email_len check (char_length(email) between 3 and 200)
);

create index if not exists waitlist_email_created_idx
  on public.waitlist (email, created_at desc);

alter table public.site_settings enable row level security;
alter table public.discover_categories enable row level security;
alter table public.discover_subcategories enable row level security;
alter table public.discover_place_types enable row level security;
alter table public.waitlist enable row level security;

grant select on public.site_settings to anon, authenticated;
grant select on public.discover_categories to anon, authenticated;
grant select on public.discover_subcategories to anon, authenticated;
grant select on public.discover_place_types to anon, authenticated;
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;

drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists discover_categories_read on public.discover_categories;
create policy discover_categories_read on public.discover_categories
  for select to anon, authenticated
  using (status <> 'parked');

drop policy if exists discover_subcategories_read on public.discover_subcategories;
create policy discover_subcategories_read on public.discover_subcategories
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.discover_categories c
      where c.id = category_id and c.status <> 'parked'
    )
  );

drop policy if exists discover_place_types_read on public.discover_place_types;
create policy discover_place_types_read on public.discover_place_types
  for select to anon, authenticated
  using (discover_status = 'Live');

drop policy if exists waitlist_insert on public.waitlist;
create policy waitlist_insert on public.waitlist
  for insert to anon, authenticated
  with check (
    email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(email) <= 200
    and (source_page is null or char_length(source_page) <= 200)
    and (category is null or char_length(category) <= 120)
    and (subcategory is null or char_length(subcategory) <= 120)
    and (city is null or char_length(city) <= 120)
    and consented_at is not null
  );

commit;
