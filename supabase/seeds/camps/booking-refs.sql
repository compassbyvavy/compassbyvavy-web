-- Booking-system links for the spots checker.
-- Run this in the Supabase SQL Editor after the camp session seeds and after
-- 20261113120000_camp_session_spots.sql. The foreign key fails if the session
-- row is missing. Safe to run again.
--
-- Skipped (no row, so the checker does not call them):
--
-- COOKSMART (Acuity). Needs the camp's permission. Ask for an Acuity API key
-- (Acuity → Integrations → API → view credentials) for user id 16600547, with
-- read access to availability. Appointment types: full day 99733065, half day
-- 99732924. Sessions that stay on the manual line:
--   MSC-0381-2026-12-21-full
--   MSC-0381-2026-12-28-full
--   MSC-0381-2026-12-21-half
--   MSC-0381-2026-12-28-half
--
-- YMCA (ActiveNet). The adapter exists, but activity 115093 is the Winter
-- Break Inclusion Support pre-enrollment list, not camp seats. Ask YMCA for
-- the ActiveNet activity id (the number at the end of the detail URL) for
-- each Mississauga winter camp week. Sessions that stay on the manual line:
--   MSC-0049-2026-12-21
--   MSC-0049-2026-12-29

begin;

insert into public.camp_session_booking_refs (session_id, booking_system, external_ref, enabled)
values
  (
    'MSC-0285-2026-12-21',
    'iclasspro',
    jsonb_build_object(
      'orgCode', 'futures',
      'locationId', 2,
      'typeId', 135,
      'campId', 4278,
      'url', 'https://portal.iclasspro.com/futures/camps/135?sortBy=time'
    ),
    true
  ),
  (
    'MSC-0285-2026-12-28',
    'iclasspro',
    jsonb_build_object(
      'orgCode', 'futures',
      'locationId', 2,
      'typeId', 135,
      'campId', 4279,
      'url', 'https://portal.iclasspro.com/futures/camps/135?sortBy=time'
    ),
    true
  ),
  (
    'MSC-0046-winter-2026-27',
    'jackrabbit',
    jsonb_build_object(
      'orgId', '537009',
      'openingsUrl', 'https://app.jackrabbitclass.com/webregopeningsv2.asp?searchpage=29750&rvcol=0&rtcol=2&rc=0,1,2,3&hc=0,7&hcat1=no&oid=537009&gf=1&af=1'
    ),
    true
  ),
  (
    'MSC-0081-2026-12-21',
    'squarespace',
    jsonb_build_object(
      'productPath', '/holiday/p/holiday-camp',
      'url', 'https://www.magnitudewell.ca/holiday/p/holiday-camp',
      'productId', '639c9bbd8cade3085c5df7f0'
    ),
    true
  )
on conflict (session_id) do update
set booking_system = excluded.booking_system,
    external_ref = excluded.external_ref,
    enabled = excluded.enabled;

commit;
