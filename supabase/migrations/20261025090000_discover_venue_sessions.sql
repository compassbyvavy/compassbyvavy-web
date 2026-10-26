-- Venues that sell bookable sessions (drop-off play, stay-and-play, classes)
-- rather than one admission ticket. Follows 20261024090000_discover_venue_prices_by_day.sql.
-- Idempotent: safe to run more than once.

begin;

-- Which session a price belongs to, matching a program's name
-- (e.g. 'Stay + Play'). NULL = a general price, as before.
alter table public.place_prices
  add column if not exists session_name text;
comment on column public.place_prices.session_name is
  'The bookable session this price is for, matching place_programs.name. NULL = a general price.';

-- A rate only for an additional child from the same family.
alter table public.place_prices
  add column if not exists sibling_only boolean not null default false;
comment on column public.place_prices.sibling_only is
  'True for a sibling rate: the price for each additional child from the same family.';

-- Whether a parent stays for a session or drops the child off, as the venue states it.
alter table public.place_programs
  add column if not exists attendance text;
alter table public.place_programs drop constraint if exists place_programs_attendance_chk;
alter table public.place_programs add constraint place_programs_attendance_chk check (
  attendance is null or attendance in ('with_parent', 'drop_off')
);
comment on column public.place_programs.attendance is
  'with_parent = a parent or caregiver stays; drop_off = the child is left with staff. NULL = not stated.';

commit;
