begin;

create table public.member_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['applications:read', 'applications:write']::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (scopes <@ array['applications:read', 'applications:write']::text[])
);

create index member_api_keys_user_idx on public.member_api_keys (user_id, created_at desc);
alter table public.member_api_keys enable row level security;
revoke all on public.member_api_keys from anon, authenticated;

alter table public.internship_applications
  add column if not exists external_id text,
  add column if not exists api_key_id uuid references public.member_api_keys(id) on delete set null;

alter table public.internship_applications
  drop constraint if exists internship_applications_entry_source_check;
alter table public.internship_applications
  add constraint internship_applications_entry_source_check
  check (entry_source in ('manual', 'spreadsheet_import', 'email', 'browser_extension', 'api', 'mcp'));

create unique index internship_applications_user_external_id_idx
  on public.internship_applications (user_id, external_id)
  where external_id is not null;

create table public.application_api_audit_logs (
  id bigint generated always as identity primary key,
  api_key_id uuid references public.member_api_keys(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  application_id uuid references public.internship_applications(id) on delete set null,
  outcome text not null check (outcome in ('success', 'duplicate', 'invalid', 'denied', 'rate_limited')),
  created_at timestamptz not null default now()
);

create index application_api_audit_key_time_idx
  on public.application_api_audit_logs (api_key_id, created_at desc);
alter table public.application_api_audit_logs enable row level security;
revoke all on public.application_api_audit_logs from anon, authenticated;

comment on table public.member_api_keys is
  'Hashed, revocable member-owned credentials for the application API. Raw keys are never stored.';
comment on column public.internship_applications.external_id is
  'Optional member-supplied idempotency identifier, unique per member.';

commit;
