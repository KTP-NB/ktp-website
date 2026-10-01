begin;

do $$
declare
  duplicate record;
begin
  for duplicate in
    select id, first_value(id) over (partition by canonical_url order by created_at, id) as keeper_id
    from public.job_board_jobs
    where canonical_url is not null
  loop
    if duplicate.id = duplicate.keeper_id then
      continue;
    end if;

    if exists (select 1 from public.job_board_saved_jobs where job_id = duplicate.id)
      or exists (select 1 from public.job_board_applications where job_id = duplicate.id)
      or exists (select 1 from public.job_board_ats_analyses where job_id = duplicate.id)
      or exists (select 1 from public.job_board_recommendations where job_id = duplicate.id)
      or exists (select 1 from public.job_board_notification_logs where job_id = duplicate.id)
      or exists (select 1 from public.job_board_notifications where job_id = duplicate.id) then
      raise exception 'Duplicate job % has member or notification references; reconcile manually', duplicate.id;
    end if;

    update public.job_board_source_links set job_id = duplicate.keeper_id where job_id = duplicate.id;
    delete from public.job_board_jobs where id = duplicate.id;
  end loop;
end $$;

create unique index job_board_jobs_canonical_url_unique_idx
  on public.job_board_jobs (canonical_url)
  where canonical_url is not null;

commit;
