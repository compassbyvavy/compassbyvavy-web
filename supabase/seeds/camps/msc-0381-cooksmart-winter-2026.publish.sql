-- PUBLISH: COOKSMART winter holiday cooking camp (winter 2026)
-- Makes the camp visible on compassbyvavy.ca/camps. Run only after the draft is loaded and reviewed.

begin;

do $$
declare n integer;
begin
  update public.providers set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'prov-cooksmart' and source_url ~* '^https://' and source_checked_date is not null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: provider prov-cooksmart is missing or has no source'; end if;

  update public.venues set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'venue-cooksmart-clarkson';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: venue venue-cooksmart-clarkson is missing'; end if;

  update public.camp_programs set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = 'MSC-0381';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: program MSC-0381 is missing'; end if;

  update public.camp_sessions set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id in ('MSC-0381-2026-12-21-full', 'MSC-0381-2026-12-28-full', 'MSC-0381-2026-12-21-half', 'MSC-0381-2026-12-28-half') and source_url ~* '^https://' and source_checked_date is not null and start_date is not null;
  get diagnostics n = row_count;
  if n <> 4 then raise exception 'Not published: expected 4 sessions with a source, check date and start date, found %', n; end if;
end $$;

commit;
