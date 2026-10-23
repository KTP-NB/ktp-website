-- Database owner: apply this migration once before releasing the outreach site/API
-- and MCP update. It is not applied by the application or CI.
-- Requires the existing permission tables, has_role_permission(uuid, text),
-- and set_updated_at() trigger function. See docs/recruiter-outreach-release.md.
begin;

insert into public.permission_definitions (permission_key, label, description, category, sort_order, editable)
values ('recruiter_emails.use', 'Recruiter Outreach', 'Track and import personal emails sent to recruiters.', 'Member Account', 25, true);

-- Give the new tracker to roles that already have application tracking access.
insert into public.role_permissions (role_key, permission_key)
select role_key, 'recruiter_emails.use' from public.role_permissions where permission_key = 'applications.use'
on conflict do nothing;

create table public.recruiter_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipients jsonb not null,
  company text check (char_length(company) <= 160),
  position text check (char_length(position) <= 200),
  subject text check (char_length(subject) <= 500),
  sent_at timestamptz not null,
  notes text check (char_length(notes) <= 5000),
  provider text check (provider ~ '^[a-z][a-z0-9_-]{0,39}$'),
  mailbox_id text check (char_length(btrim(mailbox_id)) between 1 and 320),
  message_id text check (char_length(btrim(message_id)) between 1 and 500),
  thread_id text check (char_length(thread_id) <= 500),
  source_url text check (char_length(source_url) <= 2000 and source_url ~ '^https?://'),
  entry_source text not null check (entry_source in ('manual', 'email')),
  deleted_at timestamptz,
  check (jsonb_typeof(recipients) = 'array' and
    ((deleted_at is null and jsonb_array_length(recipients) between 1 and 20)
      or (deleted_at is not null and recipients = '[]'::jsonb))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (coalesce(company, '') || ' ' || coalesce(position, '') || ' ' || coalesce(subject, '') || ' ' || recipients::text) stored,
  check ((provider is null and mailbox_id is null and message_id is null and thread_id is null and entry_source = 'manual')
    or (provider is not null and mailbox_id is not null and message_id is not null and entry_source = 'email')),
  unique (user_id, provider, mailbox_id, message_id)
);

create index recruiter_emails_owner_date_idx on public.recruiter_emails (user_id, sent_at desc, id desc) where deleted_at is null;
create trigger recruiter_emails_set_updated_at before update on public.recruiter_emails
for each row execute function public.set_updated_at();

alter table public.recruiter_emails enable row level security;
-- All writes go through the validated API, including website edits and deletion.
revoke all on public.recruiter_emails from anon, authenticated;
grant select on public.recruiter_emails to authenticated;
grant all on public.recruiter_emails to service_role;
create policy "members read own recruiter emails" on public.recruiter_emails
for select to authenticated using (
  user_id = (select auth.uid()) and deleted_at is null
  and public.has_role_permission((select auth.uid()), 'recruiter_emails.use')
);

comment on table public.recruiter_emails is 'Personal sent recruiter outreach. Deleted imports retain only source identifiers to prevent reimport.';

create function public.recruiter_email_summary(owner_id uuid, search_pattern text, from_date timestamptz, before_date timestamptz)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  with matching as (
    select recipients from public.recruiter_emails
    where user_id = owner_id and deleted_at is null
      and (search_pattern is null or search_text ilike search_pattern)
      and (from_date is null or sent_at >= from_date)
      and (before_date is null or sent_at < before_date)
  )
  select jsonb_build_object(
    'emails', (select count(*) from matching),
    'recruiters', (select count(distinct lower(recipient->>'email')) from matching, jsonb_array_elements(recipients) recipient)
  );
$$;
revoke all on function public.recruiter_email_summary(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.recruiter_email_summary(uuid, text, timestamptz, timestamptz) to service_role;

commit;
