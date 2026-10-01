create or replace function public.job_board_invoke_new_grad_ingest()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_source record;
  v_count integer := 0;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'job_board_intern_list_edge_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'job_board_intern_list_cron_secret';
  if v_url is null or v_secret is null then
    raise exception 'Airtable ingestion Cron secrets are not configured';
  end if;

  for v_source in
    select id from public.job_board_sources
    where provider = 'new_grad_jobs' and enabled = true
    order by priority, id
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ingest-secret', v_secret),
      body := jsonb_build_object('sourceId', v_source.id, 'provider', 'new_grad_jobs'),
      timeout_milliseconds := 120000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.job_board_invoke_new_grad_ingest() from public, anon, authenticated;
grant execute on function public.job_board_invoke_new_grad_ingest() to service_role;

select cron.schedule(
  'job-board-new-grad-daily',
  '15 8 * * *',
  'select public.job_board_invoke_new_grad_ingest();'
);
