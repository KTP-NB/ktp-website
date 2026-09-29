-- Prevent admin, cron, and retry workers from ingesting the same source concurrently.

begin;

alter table public.job_board_sources
  add column if not exists ingestion_lock_token uuid,
  add column if not exists ingestion_lock_expires_at timestamptz;

create index if not exists job_board_sources_ingestion_lock_expires_at_idx
  on public.job_board_sources (ingestion_lock_expires_at)
  where ingestion_lock_expires_at is not null;

create or replace function public.job_board_acquire_ingestion_lock(
  p_source_id uuid,
  p_lock_token uuid,
  p_now timestamptz default now(),
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease duration must be between 30 and 3600 seconds';
  end if;

  update public.job_board_sources
  set ingestion_lock_token = p_lock_token,
      ingestion_lock_expires_at = p_now + make_interval(secs => p_lease_seconds),
      updated_at = p_now
  where id = p_source_id
    and enabled = true
    and (
      ingestion_lock_expires_at is null
      or ingestion_lock_expires_at <= p_now
      or ingestion_lock_token = p_lock_token
    );

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.job_board_release_ingestion_lock(
  p_source_id uuid,
  p_lock_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.job_board_sources
  set ingestion_lock_token = null,
      ingestion_lock_expires_at = null,
      updated_at = now()
  where id = p_source_id
    and ingestion_lock_token = p_lock_token;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.job_board_acquire_ingestion_lock(uuid, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.job_board_release_ingestion_lock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.job_board_acquire_ingestion_lock(uuid, uuid, timestamptz, integer) to service_role;
grant execute on function public.job_board_release_ingestion_lock(uuid, uuid) to service_role;

commit;
