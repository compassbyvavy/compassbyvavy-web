-- Camp sessions: the registration deadline a camp publishes (e.g. "register by Dec 14").
-- Shown on the camp page as a date ("Registration closes Dec 14"), never as a countdown.
-- Null = the camp doesn't publish one; nothing is inferred.
-- Idempotent: safe to run more than once.

begin;

alter table public.camp_sessions
  add column if not exists registration_deadline_on date;

comment on column public.camp_sessions.registration_deadline_on is
  'Last day to register, only when the camp publishes it. Shown as a date, never a countdown.';

do $$ begin
  alter table public.camp_sessions
    add constraint camp_sessions_deadline_before_end_chk
    check (registration_deadline_on is null or end_date is null or registration_deadline_on <= end_date);
exception when duplicate_object then null;
end $$;

commit;
