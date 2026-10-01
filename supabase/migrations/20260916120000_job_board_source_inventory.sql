-- Refresh complete source inventories and archive jobs absent from every source.

begin;

alter table public.job_board_ingestion_runs
  add column if not exists refreshed_count integer not null default 0 check (refreshed_count >= 0),
  add column if not exists stale_archived_count integer not null default 0 check (stale_archived_count >= 0);

create or replace function public.job_board_finalize_source_inventory(
  p_source_id uuid,
  p_seen_external_ids text[],
  p_cycle_started_at timestamptz default now(),
  p_stale_after_days integer default 7,
  p_inventory_unchanged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  refreshed_count integer := 0;
  archived_count integer := 0;
  stale_before timestamptz;
begin
  if p_stale_after_days < 1 or p_stale_after_days > 90 then
    raise exception 'stale grace period must be between 1 and 90 days';
  end if;

  if p_inventory_unchanged then
    update public.job_board_source_links
    set last_seen_at = p_cycle_started_at,
        updated_at = p_cycle_started_at
    where source_id = p_source_id;
  else
    update public.job_board_source_links
    set last_seen_at = p_cycle_started_at,
        updated_at = p_cycle_started_at
    where source_id = p_source_id
      and source_external_id = any(coalesce(p_seen_external_ids, '{}'::text[]));
  end if;
  get diagnostics refreshed_count = row_count;

  stale_before := p_cycle_started_at - make_interval(days => p_stale_after_days);

  with stale_jobs as (
    select distinct source_link.job_id
    from public.job_board_source_links source_link
    where source_link.source_id = p_source_id
      and source_link.last_seen_at < stale_before
  ), archived as (
    update public.job_board_jobs job
    set status = 'archived',
        inactive_at = p_cycle_started_at,
        updated_at = p_cycle_started_at
    where job.status = 'open'
      and job.id in (select stale_jobs.job_id from stale_jobs)
      and not exists (
        select 1
        from public.job_board_source_links fresh_link
        where fresh_link.job_id = job.id
          and fresh_link.last_seen_at >= stale_before
      )
    returning job.id
  )
  select count(*) into archived_count from archived;

  return jsonb_build_object(
    'refreshed_count', refreshed_count,
    'archived_count', archived_count,
    'stale_before', stale_before
  );
end;
$$;

revoke all on function public.job_board_finalize_source_inventory(uuid, text[], timestamptz, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.job_board_finalize_source_inventory(uuid, text[], timestamptz, integer, boolean)
  to service_role;

commit;
