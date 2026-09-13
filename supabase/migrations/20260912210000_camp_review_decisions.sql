-- Compass by Vavy — append-only field-level review decisions (Prompt 7B)
-- Approval records reviewed truth only. Does NOT publish to camp_programs / camp_sessions.
-- One table: field granularity lives in JSONB; history is the sequence of rows.

create table if not exists public.camp_review_decisions (
  id uuid primary key default gen_random_uuid(),

  candidate_id uuid not null
    references public.camp_candidates(id),

  source_snapshot_id uuid
    references public.camp_source_snapshots(id),

  field_decisions jsonb not null,

  overall_status text not null
    check (
      overall_status in (
        'fully_approved',
        'partially_approved',
        'needs_followup',
        'rejected'
      )
    ),

  notes text,

  reviewed_by text not null default 'vineeta',

  reviewed_at timestamptz not null default now()
);

create index if not exists camp_review_decisions_candidate_idx
  on public.camp_review_decisions (candidate_id);

create index if not exists camp_review_decisions_candidate_reviewed_at_idx
  on public.camp_review_decisions (candidate_id, reviewed_at desc);

alter table public.camp_review_decisions enable row level security;

-- No anon/authenticated policies: ingestion review is server/service-role only.
comment on table public.camp_review_decisions is
  'Append-only field-level human review decisions. Approve here does not publish catalog rows.';
