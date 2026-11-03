-- Follow-up to 20261017030000_discover_venue_detail.sql (already merged, so it is
-- not edited). Lets real venue records keep facts that are awaiting follow-up
-- without weakening what can be verified, and adds the cost-estimator charging rule.
-- Idempotent: safe to run more than once.

begin;

-- How a required extra is charged. unknown = not stated; the cost estimator then
-- leaves it out and says so.
-- per_child: each child; per_participant: each person taking part (children and
-- any adults who join in); per_person: everyone in the group, watchers included;
-- per_booking: once per visit.
do $$ begin
  create type public.price_charge_basis as enum (
    'per_child', 'per_participant', 'per_person', 'per_booking', 'unknown'
  );
exception when duplicate_object then null;
end $$;

alter table public.places
  add column if not exists typical_visit_note text;
comment on column public.places.typical_visit_note is
  'How the typical visit length was judged, as researched (e.g. "Typical visit 1.5–2 hours").';

alter table public.place_prices
  add column if not exists charge_basis public.price_charge_basis not null default 'unknown';
comment on column public.place_prices.charge_basis is
  'Who a required extra is charged for. unknown keeps it out of the cost estimate.';

-- A promotion without a confirmed end date may be stored for follow-up, but it
-- can only be verified (and shown) once valid_to is recorded.
alter table public.place_prices drop constraint if exists place_prices_promo_chk;
alter table public.place_prices add constraint place_prices_promo_chk check (
  kind <> 'promotion' or valid_to is not null or verification_status = 'needs_follow_up'
);

-- A first-hand visit note has no web source. Every other theme still needs an
-- https source before it can be verified; follow-up themes may lack one.
alter table public.place_experience_themes alter column source_url drop not null;
alter table public.place_experience_themes drop constraint if exists place_experience_themes_source_chk;
alter table public.place_experience_themes add constraint place_experience_themes_source_chk check (
  basis = 'first_hand_visit' or source_url is not null or verification_status = 'needs_follow_up'
);

-- A reviewer theme can only be verified once its review source is recorded.
alter table public.place_experience_themes drop constraint if exists place_experience_themes_reviewer_source_chk;
alter table public.place_experience_themes add constraint place_experience_themes_reviewer_source_chk check (
  basis <> 'reviewer_reported' or review_source_id is not null or verification_status = 'needs_follow_up'
);

commit;
