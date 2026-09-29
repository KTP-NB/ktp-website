create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.job_board_invoke_h1b_ingest()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'job_board_h1b_edge_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'job_board_h1b_cron_secret';
  if v_url is null or v_secret is null then
    raise exception 'H1B ingestion Cron secrets are not configured';
  end if;
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ingest-secret', v_secret),
    body := '{"provider":"jobright_h1b"}'::jsonb,
    timeout_milliseconds := 15000
  );
end;
$$;

create or replace function public.job_board_configure_h1b_cron(p_secret text, p_function_url text)
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
  if p_function_url !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/job-github-ingest$' then
    raise exception 'Invalid ingestion function URL';
  end if;

  select id into v_id from vault.secrets where name = 'job_board_h1b_cron_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'job_board_h1b_cron_secret');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
  select id into v_id from vault.secrets where name = 'job_board_h1b_edge_url';
  if v_id is null then
    perform vault.create_secret(p_function_url, 'job_board_h1b_edge_url');
  else
    perform vault.update_secret(v_id, p_function_url);
  end if;

  perform cron.schedule(
    'job-board-h1b-twice-daily',
    '0 0,12 * * *',
    'select public.job_board_invoke_h1b_ingest();'
  );
end;
$$;

revoke all on function public.job_board_invoke_h1b_ingest() from public, anon, authenticated;
revoke all on function public.job_board_configure_h1b_cron(text, text) from public, anon, authenticated;
grant execute on function public.job_board_configure_h1b_cron(text, text) to service_role;
