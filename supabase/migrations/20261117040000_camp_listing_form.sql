-- Camp listing invites and submissions.
-- Do not run this from the app, and do not run it against production from this branch.
-- The form on this branch stores rows in data/camps/listing-form/state.json until this is applied.
-- Camps insert only through the token route, which uses the service key.
-- anon and authenticated cannot read or write these tables.

begin;

create table if not exists public.camp_invites (
  id uuid primary key default gen_random_uuid(),
  camp text not null,
  intake_rows int[] not null,
  contact_email text,
  token_hash text unique not null,
  sent_at timestamptz,
  expires_at timestamptz not null,
  opened_at timestamptz,
  submitted_at timestamptz,
  custom_questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'opened', 'submitted', 'reviewed', 'opted_out')),
  send_count integer not null default 0 check (send_count >= 0 and send_count <= 2)
);

comment on table public.camp_invites is
  'One private link per camp. The token is stored hashed. Status opted_out means no more emails.';

create table if not exists public.camp_submissions (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.camp_invites (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  contact jsonb not null,
  answers jsonb not null,
  photos jsonb not null default '[]'::jsonb,
  photo_rights boolean not null,
  child_permission boolean not null,
  accuracy_confirmed boolean not null,
  typed_name text not null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'partly_approved', 'rejected')),
  reviewed_at timestamptz,
  note text
);

comment on table public.camp_submissions is
  'A camp''s answers. Nothing here is public until review_status is approved or partly_approved.';

create table if not exists public.camp_invite_events (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.camp_invites (id) on delete cascade,
  kind text not null check (kind in ('sent', 'reminder', 'opened', 'unsubscribed', 'submitted')),
  at timestamptz not null default timezone('utc', now()),
  note text
);

comment on table public.camp_invite_events is
  'Send, open, reminder and unsubscribe log for one invite.';

revoke all on table public.camp_invites from anon, authenticated, public;
revoke all on table public.camp_submissions from anon, authenticated, public;
revoke all on table public.camp_invite_events from anon, authenticated, public;

grant select, insert, update, delete on table public.camp_invites to service_role;
grant select, insert, update, delete on table public.camp_submissions to service_role;
grant select, insert, update, delete on table public.camp_invite_events to service_role;

alter table public.camp_invites enable row level security;
alter table public.camp_submissions enable row level security;
alter table public.camp_invite_events enable row level security;

insert into storage.buckets (id, name, public)
values ('camp-submissions', 'camp-submissions', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('camp-listing-photos', 'camp-listing-photos', true)
on conflict (id) do nothing;

comment on column public.camp_submissions.photos is
  'Private paths in the camp-submissions bucket. Approved files are copied to camp-listing-photos.';

commit;
