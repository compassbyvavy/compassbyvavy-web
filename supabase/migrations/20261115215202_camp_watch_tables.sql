-- Camp Watcher registry, snapshots, and review queue.
--
-- The spec names these camp_sources, source_snapshots, and source_changes.
-- public.camp_sources is already the ingestion registry, so the watcher uses
-- camp_watch_* with the same columns. Do not run this from the app. Vineeta
-- runs it in the Supabase SQL editor.
--
-- Parents cannot read these tables. There is no admin role in this database.
-- The service role is the only writer, the same pattern as the spots checker.
-- The watcher never writes camp_session_spots or camp_sessions.

begin;

create table if not exists public.camp_watch_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,
  camp text not null,
  break text not null,
  intake_row integer,
  adapter text not null,
  watch_url text,
  adapter_params jsonb not null default '{}'::jsonb,
  check_every text not null default 'daily',
  active boolean not null default true,
  last_checked_at timestamptz,
  last_status text,
  notes text,
  constraint camp_watch_sources_break_chk check (break in ('winter', 'pa_day', 'march_break', 'summer')),
  constraint camp_watch_sources_adapter_chk check (adapter in (
    'jackrabbit', 'iclasspro', 'acuity', 'amilia', 'activenet', 'longos', 'codeninjas', 'page', 'manual'
  )),
  constraint camp_watch_sources_frequency_chk check (check_every in ('daily', 'weekly')),
  constraint camp_watch_sources_status_chk check (
    last_status is null or last_status in ('ok', 'changed', 'unreachable', 'blocked', 'error')
  )
);

comment on table public.camp_watch_sources is
  'One camp and break the Camp Watcher checks. Not the ingestion camp_sources registry.';

create table if not exists public.camp_watch_snapshots (
  id bigserial primary key,
  source_id uuid not null references public.camp_watch_sources (id) on delete cascade,
  checked_at timestamptz not null default now(),
  http_status integer,
  content_hash text,
  facts jsonb
);

comment on table public.camp_watch_snapshots is
  'One successful read. A failed fetch does not insert a row and never stores empty facts.';

create index if not exists camp_watch_snapshots_source_checked_idx
  on public.camp_watch_snapshots (source_id, checked_at desc);

create table if not exists public.camp_watch_changes (
  id bigserial primary key,
  source_id uuid not null references public.camp_watch_sources (id) on delete cascade,
  detected_at timestamptz not null default now(),
  session_ref text,
  field text not null,
  old_value text,
  new_value text,
  kind text not null default 'review',
  status text not null default 'pending',
  reviewed_at timestamptz,
  note text,
  constraint camp_watch_changes_kind_chk check (kind in ('auto', 'review')),
  constraint camp_watch_changes_status_chk check (status in ('pending', 'approved', 'rejected', 'auto_applied')),
  constraint camp_watch_changes_field_chk check (field in (
    'dates', 'price', 'spots', 'registration', 'hours', 'ages',
    'session_new', 'session_gone', 'page_text', 'unreachable', 'needs_call'
  ))
);

comment on table public.camp_watch_changes is
  'A change waiting for review. note = urgent sorts it to the top of the morning email. Spot-count-only updates are not stored here.';

create index if not exists camp_watch_changes_pending_idx
  on public.camp_watch_changes (status, detected_at desc);

revoke all on table public.camp_watch_sources from anon, authenticated, public;
revoke all on table public.camp_watch_snapshots from anon, authenticated, public;
revoke all on table public.camp_watch_changes from anon, authenticated, public;

grant select, insert, update, delete on table public.camp_watch_sources to service_role;
grant select, insert, update, delete on table public.camp_watch_snapshots to service_role;
grant select, insert, update, delete on table public.camp_watch_changes to service_role;
grant usage, select on sequence public.camp_watch_snapshots_id_seq to service_role;
grant usage, select on sequence public.camp_watch_changes_id_seq to service_role;

alter table public.camp_watch_sources enable row level security;
alter table public.camp_watch_snapshots enable row level security;
alter table public.camp_watch_changes enable row level security;

commit;
