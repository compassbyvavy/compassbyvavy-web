-- Prices by day and adults included per ticket, plus a policy kind for
-- birthday-party rules. Follows 20261020090000_discover_venue_detail_followup.sql.
-- Idempotent: safe to run more than once.

-- Party rules (what's included, decorations, arrival) are kept apart from
-- everyday visit rules so the page can show them in their own section.
-- ADD VALUE stays outside the transaction below.
alter type public.place_policy_kind add value if not exists 'party';

begin;

-- Which days a price applies to. NULL = any day the venue is open.
-- weekend_holiday = weekends plus the holidays and school breaks the venue
-- prices as weekends.
do $$ begin
  create type public.price_day_type as enum ('weekday', 'weekend_holiday');
exception when duplicate_object then null;
end $$;

alter table public.place_prices
  add column if not exists day_type public.price_day_type;
comment on column public.place_prices.day_type is
  'Days this price applies to; NULL = any day. Lets the page show weekday and weekend prices side by side.';

alter table public.place_prices
  add column if not exists adults_included smallint;
alter table public.place_prices drop constraint if exists place_prices_adults_included_chk;
alter table public.place_prices add constraint place_prices_adults_included_chk check (
  adults_included is null or (adults_included >= 0 and adults_included <= 10)
);
comment on column public.place_prices.adults_included is
  'Adults admitted with this ticket at no extra cost, as the venue publishes it. NULL = not stated.';

commit;
