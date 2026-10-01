begin;

-- Earlier releases displayed an email toggle before delivery existed. Require fresh consent.
alter table public.job_board_notification_preferences alter column email_enabled set default false;
update public.job_board_notification_preferences set email_enabled = false where email_enabled = true;

create table public.job_board_notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.job_board_notifications(id) on delete set null,
  period_key text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  scheduled_at timestamptz not null default now(),
  locked_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_key)
);

create index job_board_notification_queue_due_idx
  on public.job_board_notification_queue (status, scheduled_at)
  where status in ('queued', 'failed', 'processing');

create table public.job_board_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.job_board_notification_queue(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'gmail_smtp',
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);
create index job_board_notification_deliveries_queue_idx
  on public.job_board_notification_deliveries (queue_id, created_at desc);

alter table public.job_board_notification_queue enable row level security;
alter table public.job_board_notification_deliveries enable row level security;
revoke all on public.job_board_notification_queue from anon, authenticated;
revoke all on public.job_board_notification_deliveries from anon, authenticated;

create or replace function public.job_board_claim_notification_queue(p_limit integer default 5)
returns setof public.job_board_notification_queue
language sql
security definer
set search_path = public
as $$
  with due as (
    select id from public.job_board_notification_queue
    where (status in ('queued', 'failed') and scheduled_at <= now() and attempts < 3)
       or (status = 'processing' and locked_until < now() and attempts < 3)
    order by scheduled_at, created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 5)
  )
  update public.job_board_notification_queue q
  set status = 'processing', attempts = q.attempts + 1,
      locked_until = now() + interval '2 minutes', updated_at = now()
  from due where q.id = due.id
  returning q.*;
$$;
revoke all on function public.job_board_claim_notification_queue(integer) from public, anon, authenticated;
grant execute on function public.job_board_claim_notification_queue(integer) to service_role;

commit;
