begin;

create or replace function public.job_board_purge_expired_jobs(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with expired as (
    select job.id
    from public.job_board_jobs job
    where coalesce(job.posted_at, job.created_at) < now() - interval '7 days'
      and not exists (
        select 1 from public.job_board_saved_jobs saved where saved.job_id = job.id
      )
      and not exists (
        select 1 from public.job_board_applications application where application.job_id = job.id
      )
      and not exists (
        select 1 from public.internship_applications tracker
        where (job.apply_url is not null and tracker.application_url = job.apply_url)
           or (lower(btrim(tracker.company)) = lower(btrim(job.company))
               and lower(btrim(tracker.position)) = lower(btrim(job.title)))
      )
    order by coalesce(job.posted_at, job.created_at), job.id
    limit least(greatest(p_limit, 1), 200)
    for update of job skip locked
  ), deleted as (
    delete from public.job_board_jobs job
    using expired
    where job.id = expired.id
    returning job.id
  )
  select count(*) into v_deleted from deleted;
  return v_deleted;
end;
$$;

revoke all on function public.job_board_purge_expired_jobs(integer) from public, anon, authenticated;
grant execute on function public.job_board_purge_expired_jobs(integer) to service_role;

select cron.schedule(
  'job-board-expired-postings-hourly',
  '0 * * * *',
  'select public.job_board_purge_expired_jobs();'
);

commit;
