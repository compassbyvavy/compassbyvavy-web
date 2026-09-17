-- Prompt 8A follow-up: fact fingerprint gate.
-- Raw content hash detects page-byte changes; fact fingerprint detects whether
-- extracted normalized facts moved. A raw change with identical facts must
-- persist the snapshot/check without creating review work.

alter table public.camp_sources
  add column if not exists last_fact_fingerprint text null;

alter table public.camp_source_snapshots
  add column if not exists fact_fingerprint text null;

comment on column public.camp_sources.last_fact_fingerprint is
  'sha256 fingerprint of the last successfully extracted normalized facts; used to skip candidate/review when only page chrome changed';

comment on column public.camp_source_snapshots.fact_fingerprint is
  'Fact fingerprint computed for this snapshot after extraction; null when extraction did not run or failed';
