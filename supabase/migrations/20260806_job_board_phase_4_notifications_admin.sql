-- Job Board / ATS Phase 4 notifications, analytics, and admin readiness.

begin;
create table if not exists public.job_board_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.job_board_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.job_board_jobs(id) on delete set null,
  recommendation_id uuid references public.job_board_recommendations(id) on delete set null,
  type text not null default 'info' check (type in ('info', 'new_job', 'recommendation', 'digest')),
  title text not null,
  message text not null,
  status text not null default 'in_app_delivered' check (status in ('queued', 'in_app_delivered', 'email_pending', 'email_skipped', 'failed')),
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.job_board_notification_preferences
  add column if not exists in_app_enabled boolean not null default true,
  add column if not exists immediate_notifications_enabled boolean not null default true,
  add column if not exists recommendation_notifications_enabled boolean not null default true,
  add column if not exists posted_today_notifications_enabled boolean not null default true;
alter table public.job_board_recommendations
  add column if not exists explanation text,
  add column if not exists status text not null default 'active' check (status in ('active', 'dismissed', 'stale')),
  add column if not exists refreshed_at timestamptz not null default now();
alter table public.job_board_notification_logs
  add column if not exists notification_id uuid references public.job_board_notifications(id) on delete set null,
  add column if not exists type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists job_board_events_user_id_idx on public.job_board_events (user_id);
create index if not exists job_board_events_event_type_idx on public.job_board_events (event_type);
create index if not exists job_board_events_created_at_idx on public.job_board_events (created_at desc);
create index if not exists job_board_notifications_user_id_idx on public.job_board_notifications (user_id);
create index if not exists job_board_notifications_read_at_idx on public.job_board_notifications (read_at);
create index if not exists job_board_notifications_created_at_idx on public.job_board_notifications (created_at desc);
create index if not exists job_board_recommendations_status_idx on public.job_board_recommendations (status);
create index if not exists job_board_recommendations_score_idx on public.job_board_recommendations (score desc);
alter table public.job_board_events enable row level security;
alter table public.job_board_notifications enable row level security;
drop policy if exists "users insert own job board events" on public.job_board_events;
create policy "users insert own job board events"
  on public.job_board_events for insert
  with check (auth.uid() = user_id);
drop policy if exists "users read own job board notifications" on public.job_board_notifications;
create policy "users read own job board notifications"
  on public.job_board_notifications for select
  using (auth.uid() = user_id);
drop policy if exists "users update own job board notifications" on public.job_board_notifications;
create policy "users update own job board notifications"
  on public.job_board_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
commit;
