-- Camp page batches and Vineeta's Approve / Fix / Decline decisions.
-- Do not run this from the app. The review screen on this branch stores
-- decisions in data/camps/pages/review-state.json until this is applied.
-- Parents cannot read these tables. service_role is the only writer.

begin;

create table if not exists public.camp_page_batches (
  id integer primary key,
  token text not null,
  created_on date not null,
  published_on date,
  constraint camp_page_batches_token_len check (char_length(token) >= 32)
);

comment on table public.camp_page_batches is
  'One review batch. The preview token stops working once published_on is set, or 30 days after created_on.';

create table if not exists public.camp_page_reviews (
  id bigint generated always as identity primary key,
  batch_id integer not null references public.camp_page_batches (id),
  slug text not null,
  status text not null,
  note text,
  decided_on date,
  constraint camp_page_reviews_status_chk check (status in ('pending', 'approved', 'fix', 'declined')),
  constraint camp_page_reviews_note_chk check (
    status in ('pending', 'approved') or (note is not null and length(btrim(note)) > 0)
  ),
  unique (batch_id, slug)
);

comment on table public.camp_page_reviews is
  'Approve, Fix, or Decline for one camp page. Fix and Decline are not published.';

revoke all on table public.camp_page_batches from anon, authenticated, public;
revoke all on table public.camp_page_reviews from anon, authenticated, public;

grant select, insert, update, delete on table public.camp_page_batches to service_role;
grant select, insert, update, delete on table public.camp_page_reviews to service_role;

alter table public.camp_page_batches enable row level security;
alter table public.camp_page_reviews enable row level security;

commit;
