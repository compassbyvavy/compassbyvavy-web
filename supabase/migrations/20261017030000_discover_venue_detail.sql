-- =============================================================================
-- Discover: venue detail facts (Play & Entertainment and other place pages)
-- Target project: compassbyvavydev (jjnkcgjcdffzgxczsqrk)
--
-- Extends public.places (one row per venue location / branch) with child
-- tables for the facts a venue detail page shows, following the venue
-- research checklist (docs/discover/venue-detail.md). Every child row carries
-- its own source_url, source_checked_date and verification_status — the same
-- provenance pattern as places, events and camp sessions.
--
-- "Not researched" = no row. "Verified unavailable" = a row saying so
-- (amenity status 'no', activity availability 'not_offered').
-- Rows start as needs_follow_up and are only publicly readable once marked
-- verified (or conflicting, which pages show with the conflict noted).
--
-- Structure only: no seed rows, nothing published.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.place_operating_status as enum (
    'open', 'temporarily_closed', 'permanently_closed', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- verified: confirmed against the source on source_checked_date
  -- conflicting: sources disagree; shown with conflict_note
  -- needs_follow_up: not shown publicly
  create type public.fact_verification as enum (
    'verified', 'conflicting', 'needs_follow_up'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_activity_availability as enum ('available', 'not_offered');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_activity_schedule as enum ('always', 'scheduled', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_price_audience as enum (
    'child', 'adult', 'infant', 'non_participant', 'family', 'group', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_price_kind as enum (
    'admission', 'addon', 'membership', 'package', 'party', 'group', 'promotion', 'fee'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- How a required extra is charged. unknown = not stated; the cost
  -- estimator then leaves it out and says so.
  -- per_child: each child; per_participant: each person taking part (children
  -- and any adults who join in); per_person: everyone in the group, watchers
  -- included; per_booking: once per visit.
  create type public.price_charge_basis as enum (
    'per_child', 'per_participant', 'per_person', 'per_booking', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_amenity_kind as enum (
    'washrooms', 'change_table', 'parent_seating', 'viewing_area',
    'stroller_access', 'stroller_storage', 'food_onsite', 'outside_food',
    'allergy_info', 'lockers', 'wheelchair_access', 'accessible_parking',
    'accessible_entrance', 'parking', 'sensory_supports', 'quiet_sessions',
    'grip_socks', 'party_rooms', 'wifi', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_policy_kind as enum (
    'age_guidance', 'supervision', 'height_limit', 'weight_limit', 'restriction',
    'waiver', 'dress_socks', 'booking_rule', 'arrival', 'food_rule',
    'cancellation', 'hours_note', 'transit', 'location_note', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_link_kind as enum (
    'website', 'phone', 'booking', 'tickets', 'reservation', 'registration'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.age_band as enum ('0_2', '3_5', '6_9', '10_12', '13_17', 'adults');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.age_band_fit as enum ('good', 'some', 'limited', 'not_suitable');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.program_cadence as enum ('ongoing', 'seasonal', 'dated');
exception when duplicate_object then null;
end $$;

do $$ begin
  -- customer_reviews: a review platform's customer reviews.
  -- editorial: blogs, guides, press — perspectives, never review counts.
  create type public.review_source_kind as enum ('customer_reviews', 'editorial');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_source_platform as enum (
    'google_places_reviews', 'google_review_summary', 'other_review_platform', 'blog_or_guide'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.experience_theme as enum (
    'age_fit', 'activity_level', 'parent_seating', 'supervision', 'busy_times',
    'cleanliness', 'staff', 'value', 'friction', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- first_hand_visit: notes from a dated visit, shown separately from review themes.
  create type public.experience_basis as enum (
    'venue_published', 'reviewer_reported', 'first_hand_visit'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.experience_sentiment as enum ('liked', 'concern', 'neutral');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.experience_agreement as enum ('consistent', 'mixed');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- places: identity and status
-- -----------------------------------------------------------------------------
alter table public.places
  add column if not exists operating_status public.place_operating_status not null default 'unknown',
  add column if not exists branch_name text,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists postal_code text,
  add column if not exists typical_visit_note text;

comment on column public.places.operating_status is
  'Whether the location is operating. Only open locations get a public page.';
comment on column public.places.branch_name is
  'Branch or location name when the venue has several (e.g. "Heartland").';
comment on column public.places.typical_visit_note is
  'How the typical visit length was judged, as researched (e.g. "Typical visit 1.5–2 hours").';
comment on column public.places.aliases is
  'Former names and common aliases, searchable but never shown as the current name.';
comment on column public.places.description is
  'Short factual introduction based only on verified information (row source_url / source_checked_date).';

-- Hours rows get their own provenance (hours change often).
alter table public.place_hours
  add column if not exists source_url text,
  add column if not exists source_checked_date date;

-- -----------------------------------------------------------------------------
-- Child tables. Common columns per table: place_id, source_url,
-- source_checked_date, verification_status, conflict_note (added below).
-- -----------------------------------------------------------------------------
create table if not exists public.place_types (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  place_type text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  constraint place_types_unique unique (place_id, place_type)
);
comment on table public.place_types is
  'Taxonomy types a venue location offers (e.g. "Indoor Playground", "Trampoline Park"), each backed by a source.';

create table if not exists public.place_age_bands (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  band public.age_band not null,
  fit public.age_band_fit not null,
  note text,
  constraint place_age_bands_unique unique (place_id, band)
);
comment on table public.place_age_bands is
  'Suitability per age band, only where a source supports it. Missing band = not confirmed.';

create table if not exists public.place_activities (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  name text not null,
  description text,
  availability public.place_activity_availability not null default 'available',
  included_in_admission public.confirmed_tri_state not null default 'unknown',
  extra_cost_note text,
  schedule public.place_activity_schedule not null default 'unknown',
  schedule_note text,
  age_min integer,
  age_max integer,
  min_height_cm integer,
  max_height_cm integer,
  max_weight_kg integer,
  safety_note text,
  sort_order integer not null default 0,
  constraint place_activities_age_chk check (
    (age_min is null or age_min >= 0)
    and (age_max is null or age_max >= 0)
    and (age_min is null or age_max is null or age_min <= age_max)
  ),
  constraint place_activities_body_chk check (
    (min_height_cm is null or min_height_cm > 0)
    and (max_height_cm is null or max_height_cm > 0)
    and (min_height_cm is null or max_height_cm is null or min_height_cm <= max_height_cm)
    and (max_weight_kg is null or max_weight_kg > 0)
  )
);
comment on table public.place_activities is
  'Activities verified at THIS location. Never copied from a chain-wide list without a location-specific source.';

create table if not exists public.place_prices (
  id uuid primary key default gen_random_uuid(),
  verification_status public.fact_verification not null default 'needs_follow_up',
  place_id text not null references public.places (id) on delete cascade,
  kind public.place_price_kind not null default 'admission',
  label text not null,
  audience public.place_price_audience not null default 'other',
  age_min integer,
  age_max integer,
  duration_minutes integer,
  includes_note text,
  amount numeric(10, 2),
  is_free boolean not null default false,
  currency public.camp_currency not null default 'CAD',
  required_addon boolean not null default false,
  charge_basis public.price_charge_basis not null default 'unknown',
  plus_tax boolean,
  eligibility text,
  valid_to date,
  notes text,
  sort_order integer not null default 0,
  constraint place_prices_amount_chk check (
    (is_free and (amount is null or amount = 0))
    or (not is_free and amount is not null and amount > 0)
  ),
  constraint place_prices_duration_chk check (
    duration_minutes is null or (duration_minutes > 0 and duration_minutes <= 1440)
  ),
  constraint place_prices_age_chk check (
    age_min is null or age_max is null or age_min <= age_max
  ),
  -- A promotion without a confirmed end date can be kept for follow-up but
  -- never verified (verification_status is declared here so this check can use it).
  constraint place_prices_promo_chk check (kind <> 'promotion' or valid_to is not null or verification_status = 'needs_follow_up')
);
comment on table public.place_prices is
  'Prices exactly as published, one line per price. Promotions need an expiry. Unknown prices are simply absent.';

create table if not exists public.place_programs (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  name text not null,
  description text,
  cadence public.program_cadence not null,
  schedule_note text,
  starts_on date,
  ends_on date,
  age_min integer,
  age_max integer,
  price_note text,
  registration_url text,
  sort_order integer not null default 0,
  constraint place_programs_dates_chk check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint place_programs_url_chk check (registration_url is null or registration_url ~* '^https://')
);
comment on table public.place_programs is
  'Programs and special experiences at this location (toddler time, sensory sessions, seasonal events).';

create table if not exists public.place_amenities (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  amenity public.place_amenity_kind not null,
  status public.confirmed_tri_state not null,
  note text,
  constraint place_amenities_known_chk check (status <> 'unknown')
);
comment on table public.place_amenities is
  'Verified amenity facts. No row = not confirmed; status no = verified unavailable.';

create table if not exists public.place_policies (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  kind public.place_policy_kind not null,
  body text not null,
  sort_order integer not null default 0
);
comment on table public.place_policies is
  'Venue-published rules and visit guidance, in Compass wording, each with its source.';

create table if not exists public.place_links (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  kind public.place_link_kind not null,
  value text not null,
  label text,
  sort_order integer not null default 0,
  constraint place_links_url_chk check (kind = 'phone' or value ~* '^https://')
);
comment on table public.place_links is
  'Official, venue-owned links and phone numbers. URLs must be https.';

create table if not exists public.place_review_sources (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  kind public.review_source_kind not null,
  platform public.review_source_platform not null,
  source_name text not null,
  coverage_note text not null,
  selection_method text,
  items_reviewed integer,
  period_from date,
  period_to date,
  stated_rating numeric(3, 2),
  stated_rating_count integer,
  rating_scale numeric(3, 1),
  provider_disclosure text,
  provider_attributions jsonb,
  constraint place_review_sources_items_chk check (items_reviewed is null or items_reviewed >= 0),
  constraint place_review_sources_period_chk check (period_from is null or period_to is null or period_from <= period_to),
  -- Ratings only as the source states them, never for editorial sources.
  constraint place_review_sources_rating_chk check (
    (stated_rating is null and stated_rating_count is null and rating_scale is null)
    or (
      kind = 'customer_reviews'
      and stated_rating is not null
      and rating_scale is not null
      and stated_rating >= 0
      and stated_rating <= rating_scale
      and (stated_rating_count is null or stated_rating_count >= 0)
    )
  ),
  -- Google Places returns at most five individual reviews per place.
  constraint place_review_sources_google_items_chk check (
    platform <> 'google_places_reviews' or items_reviewed is null or items_reviewed <= 5
  ),
  -- Editorial sources are perspectives, not customer reviews.
  constraint place_review_sources_kind_platform_chk check (
    (kind = 'editorial') = (platform = 'blog_or_guide')
  )
);
comment on table public.place_review_sources is
  'Review and editorial sources behind the parent experience summary: name, link, date accessed, what was reviewed and the period covered. Review text is not stored.';
comment on column public.place_review_sources.provider_disclosure is
  'Exact disclosure text required by the provider (e.g. Google review summaries), shown verbatim.';
comment on column public.place_review_sources.provider_attributions is
  'Provider-required attributions as [{ "name": "...", "uri": "https://..." }], shown with links.';

create table if not exists public.place_experience_themes (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places (id) on delete cascade,
  theme public.experience_theme not null,
  summary text not null,
  basis public.experience_basis not null,
  sentiment public.experience_sentiment not null default 'neutral',
  agreement public.experience_agreement not null default 'consistent',
  review_source_id uuid references public.place_review_sources (id) on delete set null,
  sort_order integer not null default 0,
  verification_status public.fact_verification not null default 'needs_follow_up',
  -- A first-hand visit note has no web source; every other theme must cite
  -- one before it can be verified (themes kept for follow-up may lack it).
  source_url text,
  constraint place_experience_themes_summary_len_chk check (char_length(summary) <= 400),
  constraint place_experience_themes_source_chk check (
    basis = 'first_hand_visit' or source_url is not null or verification_status = 'needs_follow_up'
  ),
  -- A reviewer theme can only be verified once its review source is recorded.
  constraint place_experience_themes_reviewer_source_chk check (
    basis <> 'reviewer_reported' or review_source_id is not null or verification_status = 'needs_follow_up'
  )
);
comment on table public.place_experience_themes is
  'Parent experience themes in Compass''s own words. basis separates venue-published facts, reviewer-reported themes and first-hand visit notes.';

-- -----------------------------------------------------------------------------
-- Shared provenance columns, indexes, triggers, grants and public-read policies
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'place_types', 'place_age_bands', 'place_activities', 'place_prices',
    'place_programs', 'place_amenities', 'place_policies', 'place_links',
    'place_review_sources', 'place_experience_themes'
  ]
  loop
    execute format($c$
      alter table public.%I
        add column if not exists source_url text not null,
        add column if not exists source_checked_date date not null,
        add column if not exists verification_status public.fact_verification not null default 'needs_follow_up',
        add column if not exists conflict_note text,
        add column if not exists created_at timestamptz not null default timezone('utc', now()),
        add column if not exists updated_at timestamptz not null default timezone('utc', now())
    $c$, t);
    execute format($c$
      do $inner$ begin
        alter table public.%I add constraint %I check (source_url ~* '^https://');
      exception when duplicate_object then null;
      end $inner$
    $c$, t, t || '_source_url_chk');
    execute format($c$
      do $inner$ begin
        alter table public.%I add constraint %I check (verification_status <> 'conflicting' or conflict_note is not null);
      exception when duplicate_object then null;
      end $inner$
    $c$, t, t || '_conflict_note_chk');
    execute format('create index if not exists %I on public.%I (place_id)', t || '_place_id_idx', t);
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format($p$
      create policy %I on public.%I
        for select
        to anon, authenticated
        using (
          %I.verification_status <> 'needs_follow_up'::public.fact_verification
          and exists (
            select 1
            from public.places p
            where p.id = %I.place_id
              and p.published_at is not null
              and p.publication_state = 'published'::public.publication_state
              and p.operating_status = 'open'::public.place_operating_status
          )
        )
    $p$, t || '_public_read', t, t, t);
  end loop;
end $$;

commit;
