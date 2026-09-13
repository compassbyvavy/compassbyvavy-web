-- Compass by Vavy — camp ingestion persistence (Prompt 8)
-- Ingestion-only tables. Does NOT modify published camp_programs / camp_sessions.
-- Public/anon: no write. Service role used by server-side runners only.

create extension if not exists pgcrypto;

create table if not exists public.camp_sources (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  source_type text not null,
  source_url text not null,
  canonical_url text not null,
  registration_platform text null,
  is_active boolean not null default true,
  crawl_strategy text not null default 'html',
  crawl_frequency text not null default 'daily',
  check_interval_hours integer not null default 24,
  extractor_key text null,
  next_check_at timestamptz null,
  last_checked_at timestamptz null,
  last_successful_at timestamptz null,
  last_changed_at timestamptz null,
  last_content_hash text null,
  last_error_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists camp_sources_canonical_url_uidx
  on public.camp_sources (canonical_url);
create index if not exists camp_sources_due_idx
  on public.camp_sources (is_active, next_check_at)
  where is_active = true;
create index if not exists camp_sources_provider_idx
  on public.camp_sources (provider_id);

create table if not exists public.camp_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.camp_sources(id) on delete cascade,
  retrieved_at timestamptz not null,
  http_status integer null,
  content_type text null,
  content_hash text not null,
  raw_content text null,
  raw_content_ref text null,
  raw_metadata jsonb null,
  fetch_status text not null,
  fetch_error text null,
  previous_snapshot_id uuid null references public.camp_source_snapshots(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists camp_source_snapshots_source_retrieved_idx
  on public.camp_source_snapshots (source_id, retrieved_at desc);
create index if not exists camp_source_snapshots_hash_idx
  on public.camp_source_snapshots (source_id, content_hash);

create table if not exists public.camp_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.camp_source_snapshots(id) on delete cascade,
  extractor_version text not null,
  started_at timestamptz not null,
  completed_at timestamptz null,
  status text not null,
  warnings jsonb not null default '[]'::jsonb,
  error text null,
  created_at timestamptz not null default now()
);

create index if not exists camp_extraction_runs_snapshot_idx
  on public.camp_extraction_runs (snapshot_id);

create table if not exists public.camp_extracted_records (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid not null references public.camp_extraction_runs(id) on delete cascade,
  record_type text not null,
  source_identity text not null,
  raw_fields jsonb not null default '{}'::jsonb,
  normalized_fields jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists camp_extracted_records_run_idx
  on public.camp_extracted_records (extraction_run_id);
create index if not exists camp_extracted_records_identity_idx
  on public.camp_extracted_records (source_identity);

create table if not exists public.camp_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_type text not null,
  source_record_ids jsonb not null default '[]'::jsonb,
  matched_catalog_id text null,
  match_confidence numeric null,
  candidate_data jsonb not null default '{}'::jsonb,
  status text not null,
  review_reason text null,
  quality_flags jsonb not null default '[]'::jsonb,
  pipeline_outcome text null,
  source_id uuid null references public.camp_sources(id) on delete set null,
  snapshot_id uuid null references public.camp_source_snapshots(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null
);

create index if not exists camp_candidates_status_idx
  on public.camp_candidates (status);
create index if not exists camp_candidates_matched_catalog_idx
  on public.camp_candidates (matched_catalog_id);
create index if not exists camp_candidates_source_idx
  on public.camp_candidates (source_id);

create table if not exists public.camp_candidate_changes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.camp_candidates(id) on delete cascade,
  field text not null,
  change_type text not null,
  old_value jsonb null,
  new_value jsonb null,
  confidence numeric not null default 0,
  source_snapshot_id uuid null references public.camp_source_snapshots(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists camp_candidate_changes_candidate_idx
  on public.camp_candidate_changes (candidate_id);

create table if not exists public.camp_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  completed_at timestamptz null,
  sources_attempted integer not null default 0,
  sources_succeeded integer not null default 0,
  sources_unchanged integer not null default 0,
  sources_changed integer not null default 0,
  extractions_succeeded integer not null default 0,
  candidates_created integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists camp_ingestion_runs_started_idx
  on public.camp_ingestion_runs (started_at desc);

alter table public.camp_sources enable row level security;
alter table public.camp_source_snapshots enable row level security;
alter table public.camp_extraction_runs enable row level security;
alter table public.camp_extracted_records enable row level security;
alter table public.camp_candidates enable row level security;
alter table public.camp_candidate_changes enable row level security;
alter table public.camp_ingestion_runs enable row level security;

-- No anon/authenticated policies: ingestion is server/service-role only.
comment on table public.camp_sources is
  'Registered camp source URLs for controlled fetch. Not published catalog.';
comment on table public.camp_candidates is
  'Review queue. Approve here does not publish to camp_programs/camp_sessions.';
