begin;

alter table public.member_profiles drop constraint if exists member_profiles_member_status_check;
alter table public.member_profiles
  add constraint member_profiles_member_status_check
  check (member_status in ('Active', 'Inactive', 'Alumni'));

alter table public.member_profiles
  add column if not exists access_role text not null default 'member'
    check (access_role in ('member', 'manager', 'admin', 'super_admin')),
  add column if not exists manager_permissions text[] not null default '{}'
    check (manager_permissions <@ array['members.manage','resumes.manage','coderank.manage','applications.manage']::text[]);

update public.member_profiles
set access_role = 'super_admin', manager_permissions = '{}'
where lower(email::text) in ('aaronbansal5@gmail.com', 'krishm.imp@gmail.com');

create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null,
  pledge_class text,
  default_application_target integer not null default 40 check (default_application_target between 0 and 1000),
  allowed_emails text[] not null default '{}',
  expires_at timestamptz not null,
  max_uses integer not null default 100 check (max_uses between 1 and 1000),
  use_count integer not null default 0 check (use_count >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.member_invites enable row level security;
revoke all on public.member_invites from anon, authenticated;

comment on column public.member_profiles.access_role is 'Authorization role; independent from chapter position.';
comment on column public.member_profiles.manager_permissions is 'Scoped permissions used only when access_role is manager.';
comment on table public.member_invites is 'Server-managed cohort invitation links. Only SHA-256 token hashes are stored.';

commit;
