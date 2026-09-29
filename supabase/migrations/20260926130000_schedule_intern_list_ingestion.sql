create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.job_board_invoke_intern_list_ingest()
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
    raise exception 'Intern List ingestion Cron secrets are not configured';
  end if;

  for v_source in
    select id from public.job_board_sources
    where provider = 'intern_list' and enabled = true
    order by priority, id
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ingest-secret', v_secret),
      body := jsonb_build_object('sourceId', v_source.id),
      timeout_milliseconds := 120000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.job_board_configure_intern_list_cron(p_secret text, p_function_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if length(p_secret) < 32 then
    raise exception 'Cron secret must be at least 32 characters';
  end if;
  if p_function_url !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/job-intern-list-ingest$' then
    raise exception 'Invalid Intern List function URL';
  end if;

  select id into v_id from vault.secrets where name = 'job_board_intern_list_cron_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'job_board_intern_list_cron_secret');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
  select id into v_id from vault.secrets where name = 'job_board_intern_list_edge_url';
  if v_id is null then
    perform vault.create_secret(p_function_url, 'job_board_intern_list_edge_url');
  else
    perform vault.update_secret(v_id, p_function_url);
  end if;

  perform cron.schedule(
    'job-board-intern-list-daily',
    '15 7 * * *',
    'select public.job_board_invoke_intern_list_ingest();'
  );
end;
$$;

revoke all on function public.job_board_invoke_intern_list_ingest() from public, anon, authenticated;
revoke all on function public.job_board_configure_intern_list_cron(text, text) from public, anon, authenticated;
grant execute on function public.job_board_configure_intern_list_cron(text, text) to service_role;

do $$
declare
  v_secret text;
  v_h1b_url text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'job_board_h1b_cron_secret';
  select decrypted_secret into v_h1b_url
  from vault.decrypted_secrets where name = 'job_board_h1b_edge_url';
  if v_secret is null or v_h1b_url is null then
    raise exception 'Configure the existing H1B ingestion Cron before scheduling Intern List';
  end if;

  perform public.job_board_configure_intern_list_cron(
    v_secret,
    replace(v_h1b_url, '/job-github-ingest', '/job-intern-list-ingest')
  );
end;
$$;
