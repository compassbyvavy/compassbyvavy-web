-- PUBLISH: Gymnastics Mississauga holiday camp (winter 2026)
-- Makes the camp visible on compassbyvavy.ca/camps. Run only after the draft is loaded and reviewed.

begin;

do $$
declare n integer;
begin
  update public.providers set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'prov-gymnastics-mississauga' and source_url ~* '^https://' and source_checked_date is not null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: provider prov-gymnastics-mississauga is missing or has no source'; end if;

  update public.venues set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'venue-gymnastics-mississauga-rose-cherry';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: venue venue-gymnastics-mississauga-rose-cherry is missing'; end if;

  update public.camp_programs set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'MSC-0046';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: program MSC-0046 is missing'; end if;

  update public.camp_sessions set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id in ('MSC-0046-winter-2026-27') and source_url ~* '^https://' and source_checked_date is not null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: expected 1 sessions with a source, check date and start date, found %', n; end if;
end $$;

commit;
