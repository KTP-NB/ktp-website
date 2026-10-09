begin;

-- Dispatch one source per minute so overlapping feeds do not race on canonical jobs.
create or replace function public.job_board_invoke_intern_list_ingest()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_source_id uuid;
  v_slot integer := extract(minute from now())::integer - 15;
begin
  if v_slot < 0 or v_slot >= 45 then
    return 0;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'job_board_intern_list_edge_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'job_board_intern_list_cron_secret';
  if v_url is null or v_secret is null then
    raise exception 'Intern List ingestion Cron secrets are not configured';
  end if;

  select id into v_source_id
  from public.job_board_sources
  where provider = 'intern_list' and enabled = true
  order by priority, id
  offset v_slot limit 1;
  if v_source_id is null then
    return 0;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ingest-secret', v_secret),
    body := jsonb_build_object('sourceId', v_source_id),
    timeout_milliseconds := 120000
  );
  return 1;
end;
$$;

create or replace function public.job_board_invoke_new_grad_ingest()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_source_id uuid;
  v_slot integer := extract(minute from now())::integer - 15;
begin
  if v_slot < 0 or v_slot >= 45 then
    return 0;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'job_board_intern_list_edge_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'job_board_intern_list_cron_secret';
  if v_url is null or v_secret is null then
    raise exception 'Airtable ingestion Cron secrets are not configured';
  end if;

  select id into v_source_id
  from public.job_board_sources
  where provider = 'new_grad_jobs' and enabled = true
  order by priority, id
  offset v_slot limit 1;
  if v_source_id is null then
    return 0;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ingest-secret', v_secret),
    body := jsonb_build_object('sourceId', v_source_id, 'provider', 'new_grad_jobs'),
    timeout_milliseconds := 120000
  );
  return 1;
end;
$$;

select cron.schedule(
  'job-board-intern-list-daily',
  '15-59 7 * * *',
  'select public.job_board_invoke_intern_list_ingest();'
);
select cron.schedule(
  'job-board-new-grad-daily',
  '15-59 8 * * *',
  'select public.job_board_invoke_new_grad_ingest();'
);

commit;
