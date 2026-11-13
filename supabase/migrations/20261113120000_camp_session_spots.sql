-- Latest spot reading per camp session, plus the booking-system link the
-- checker uses and a log of each run.
--
-- camp_session_spots: anon may read a row only when its session is published,
-- the same rule as camp_sessions_public_read. Writes are service role only
-- (no insert/update/delete grant, and no write policy).
-- camp_session_booking_refs and camp_spot_check_runs: no anon access.
-- seat_availability and source_checked_date on camp_sessions stay as they are.
-- Idempotent: safe to run more than once. Do not run this from the app.

begin;

create table if not exists public.camp_session_spots (
  session_id text primary key references public.camp_sessions (id) on delete cascade,
  spots_left integer,
  state text not null,
  checked_at timestamptz not null,
  source_url text not null,
  booking_system text not null,
  constraint camp_session_spots_spots_left_chk check (spots_left is null or spots_left >= 0),
  constraint camp_session_spots_state_chk check (state in ('available', 'full', 'waitlist', 'unknown'))
);

comment on table public.camp_session_spots is
  'Latest reading of spots left for one camp session. A failed check does not overwrite this row.';

create table if not exists public.camp_session_booking_refs (
  session_id text primary key references public.camp_sessions (id) on delete cascade,
  booking_system text not null,
  external_ref jsonb not null,
  enabled boolean not null default true
);

comment on table public.camp_session_booking_refs is
  'Links a session to its slot in a booking system. enabled is the per-camp off switch.';

create table if not exists public.camp_spot_check_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default timezone('utc', now()),
  booking_system text not null,
  sessions_checked integer not null default 0,
  errors text
);

comment on table public.camp_spot_check_runs is
  'One row per checker run and booking system. Read in the Supabase table editor.';

revoke all on table public.camp_session_spots from anon, authenticated, public;
revoke all on table public.camp_session_booking_refs from anon, authenticated, public;
revoke all on table public.camp_spot_check_runs from anon, authenticated, public;

grant select on table public.camp_session_spots to anon, authenticated;

alter table public.camp_session_spots enable row level security;
alter table public.camp_session_booking_refs enable row level security;
alter table public.camp_spot_check_runs enable row level security;

drop policy if exists camp_session_spots_public_read on public.camp_session_spots;
create policy camp_session_spots_public_read
  on public.camp_session_spots
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.camp_sessions s
      where s.id = camp_session_spots.session_id
        and s.published_at is not null
        and s.publication_state = 'published'::public.publication_state
    )
  );

commit;
