-- Distinguish raw-hash-unchanged stops from non-semantic page chrome changes
-- (raw hash different, fact fingerprint same → no candidates / no review).

alter table public.camp_ingestion_runs
  add column if not exists sources_non_semantic_change integer not null default 0;

comment on column public.camp_ingestion_runs.sources_non_semantic_change is
  'Sources where raw content changed but extracted normalized facts did not; snapshot/check persisted, no candidates';
