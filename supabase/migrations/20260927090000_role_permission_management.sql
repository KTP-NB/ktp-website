begin;

create table if not exists public.access_roles (
  role_key text primary key,
  label text not null,
  description text not null default '',
  default_public_directory_visible boolean not null default true,
  sort_order integer not null default 0,
  editable boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.permission_definitions (
  permission_key text primary key,
  label text not null,
  description text not null default '',
  category text not null,
  sort_order integer not null default 0,
  editable boolean not null default true
);

create table if not exists public.role_permissions (
  role_key text not null references public.access_roles(role_key) on delete cascade,
  permission_key text not null references public.permission_definitions(permission_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.role_permission_audit_log (
  id uuid primary key default gen_random_uuid(),
  role_key text not null,
  previous_permissions text[] not null default '{}',
  next_permissions text[] not null default '{}',
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

insert into public.access_roles
  (role_key, label, description, default_public_directory_visible, sort_order, editable)
values
  ('pledge', 'Pledge', 'New members with access to required account and assessment tools.', false, 10, true),
  ('member', 'Member', 'Initiated members with access to chapter member tools.', true, 20, true),
  ('manager', 'Manager', 'Members who may receive scoped operational permissions.', true, 30, true),
  ('admin', 'Admin', 'Chapter administrators who may receive scoped administrative permissions.', true, 40, true),
  ('super_admin', 'Super Admin', 'Full immutable access, including role configuration.', true, 50, false)
on conflict (role_key) do update set
  label = excluded.label,
  description = excluded.description,
  default_public_directory_visible = excluded.default_public_directory_visible,
  sort_order = excluded.sort_order,
  editable = excluded.editable;

insert into public.permission_definitions
  (permission_key, label, description, category, sort_order, editable)
values
  ('account.profile', 'Profile', 'View and update the member profile.', 'Member Account', 10, true),
  ('applications.use', 'Applications', 'View and manage personal internship applications.', 'Member Account', 20, true),
  ('fines.view', 'Fines', 'View personal fines and payment status.', 'Member Account', 30, true),
  ('resumes.use', 'Resume', 'Upload and manage a personal resume.', 'Member Account', 40, true),
  ('coderank.take', 'CodeRank Assessments', 'View and complete assigned CodeRank assessments.', 'Member Account', 50, true),
  ('study_tools.use', 'Study Tools', 'Access chapter study files and resources.', 'Member Tools', 60, true),
  ('company_questions.use', 'LC Company Tagged', 'Access company-tagged interview questions when compliance rules are met.', 'Member Tools', 70, true),
  ('referral_finder.use', 'Referral Finder', 'Access the chapter referral-finder extension.', 'Member Tools', 80, true),
  ('integrations.use', 'API and MCP Integrations', 'Create and manage personal API keys and integrations.', 'Member Tools', 90, true),
  ('admin.portal', 'Admin Portal', 'Open the administrative portal.', 'Administration', 100, true),
  ('members.manage', 'Member Management', 'Manage member profiles, statuses, roles, and invitations.', 'Administration', 110, true),
  ('resumes.manage', 'Resume Administration', 'Review and manage member resumes.', 'Administration', 120, true),
  ('coderank.manage', 'CodeRank Administration', 'Create assessments, manage assignments, and review OA compliance.', 'Administration', 130, true),
  ('applications.manage', 'Application Administration', 'Review member application progress and requirements.', 'Administration', 140, true),
  ('fines.manage', 'Fine Administration', 'Create, edit, and reconcile member fines.', 'Administration', 150, true),
  ('roles.manage', 'Access Roles and Permissions', 'Edit role-wide permission assignments.', 'System', 160, false)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order,
  editable = excluded.editable;

-- Seed defaults only when a role has never been configured. Future migrations
-- and UI saves must not overwrite a Super Admin's deliberate choices.
insert into public.role_permissions (role_key, permission_key)
select 'pledge', permission_key
from public.permission_definitions
where permission_key in ('account.profile','applications.use','fines.view','resumes.use','coderank.take')
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'member', permission_key
from public.permission_definitions
where category in ('Member Account', 'Member Tools')
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select role_key, permission_key
from (values ('manager'), ('admin')) roles(role_key)
cross join public.permission_definitions permissions
where permissions.category in ('Member Account', 'Member Tools')
   or permissions.permission_key = 'admin.portal'
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'super_admin', permission_key from public.permission_definitions
on conflict do nothing;

alter table public.access_roles enable row level security;
alter table public.permission_definitions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permission_audit_log enable row level security;

drop policy if exists "authenticated read access roles" on public.access_roles;
create policy "authenticated read access roles" on public.access_roles
for select to authenticated using (true);
drop policy if exists "authenticated read permission definitions" on public.permission_definitions;
create policy "authenticated read permission definitions" on public.permission_definitions
for select to authenticated using (true);
drop policy if exists "authenticated read role permissions" on public.role_permissions;
create policy "authenticated read role permissions" on public.role_permissions
for select to authenticated using (true);

grant select on public.access_roles, public.permission_definitions, public.role_permissions to authenticated;
revoke all on public.role_permission_audit_log from anon, authenticated;
revoke insert, update, delete on public.access_roles, public.permission_definitions, public.role_permissions from anon, authenticated;

create or replace function public.has_role_permission(uid uuid, requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = uid
      and (
        mp.access_role = 'super_admin'
        or requested_permission = any (mp.manager_permissions)
        or exists (
          select 1 from public.role_permissions rp
          where rp.role_key = mp.access_role
            and rp.permission_key = requested_permission
        )
      )
  );
$$;

revoke all on function public.has_role_permission(uuid, text) from public, anon;
grant execute on function public.has_role_permission(uuid, text) to authenticated;

create or replace function public.has_admin_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role_permission((select auth.uid()), permission);
$$;

revoke all on function public.has_admin_permission(text) from public, anon;
grant execute on function public.has_admin_permission(text) to authenticated;

create or replace function public.replace_role_permissions(
  target_role text,
  requested_permissions text[],
  actor uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  previous_values text[];
  normalized_values text[];
begin
  if target_role = 'super_admin' then
    raise exception 'Super Admin permissions are immutable';
  end if;
  if not exists (select 1 from public.access_roles where role_key = target_role and editable) then
    raise exception 'Unknown or immutable access role';
  end if;

  select coalesce(array_agg(distinct requested.value order by requested.value), array[]::text[])
  into normalized_values
  from unnest(coalesce(requested_permissions, array[]::text[])) requested(value)
  where requested.value <> 'roles.manage';

  if exists (
    select 1 from unnest(normalized_values) requested(permission_key)
    left join public.permission_definitions definitions using (permission_key)
    where definitions.permission_key is null or not definitions.editable
  ) then
    raise exception 'One or more permissions are invalid or immutable';
  end if;

  select coalesce(array_agg(rp.permission_key order by rp.permission_key), array[]::text[])
  into previous_values
  from public.role_permissions rp where rp.role_key = target_role;

  delete from public.role_permissions where role_key = target_role;
  insert into public.role_permissions (role_key, permission_key)
  select target_role, requested.value from unnest(normalized_values) requested(value);

  insert into public.role_permission_audit_log
    (role_key, previous_permissions, next_permissions, changed_by)
  values (target_role, previous_values, normalized_values, actor);
end;
$$;

revoke all on function public.replace_role_permissions(text, text[], uuid) from public, anon, authenticated;
grant execute on function public.replace_role_permissions(text, text[], uuid) to service_role;

-- Permission-aware member-owned data policies.
drop policy if exists "members read own internship applications" on public.internship_applications;
create policy "members read own internship applications"
on public.internship_applications for select to authenticated
using ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'));
drop policy if exists "members create own internship applications" on public.internship_applications;
create policy "members create own internship applications"
on public.internship_applications for insert to authenticated
with check ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'));
drop policy if exists "members update own internship applications" on public.internship_applications;
create policy "members update own internship applications"
on public.internship_applications for update to authenticated
using ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'))
with check ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'));
drop policy if exists "members delete own internship applications" on public.internship_applications;
create policy "members delete own internship applications"
on public.internship_applications for delete to authenticated
using ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'));

drop policy if exists "members read own application requirements" on public.application_requirements;
create policy "members read own application requirements"
on public.application_requirements for select to authenticated
using ((select auth.uid()) = user_id and public.has_role_permission((select auth.uid()), 'applications.use'));

drop policy if exists "members read own fines" on public.member_fines;
create policy "members read own fines"
on public.member_fines for select to authenticated
using (
  public.has_role_permission((select auth.uid()), 'fines.view')
  and exists (
    select 1 from public.member_profiles mp
    where mp.id = member_fines.member_id and mp.user_id = (select auth.uid())
  )
);

drop policy if exists "read own resume or with resumes.manage" on public.member_resumes;
create policy "read own resume or with resumes.manage"
on public.member_resumes for select to authenticated
using (
  (
    public.has_role_permission((select auth.uid()), 'resumes.use')
    and exists (
      select 1 from public.member_profiles mp
      where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
    )
  )
  or public.has_role_permission((select auth.uid()), 'resumes.manage')
);

drop policy if exists "members write own resume" on public.member_resumes;
create policy "members write own resume"
on public.member_resumes for all to authenticated
using (
  public.has_role_permission((select auth.uid()), 'resumes.use')
  and exists (
    select 1 from public.member_profiles mp
    where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
  )
)
with check (
  public.has_role_permission((select auth.uid()), 'resumes.use')
  and exists (
    select 1 from public.member_profiles mp
    where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
  )
);

-- Company Questions already has a centralized database access function. Make
-- role permission the first requirement while retaining fine/OA compliance.
create or replace function public.company_questions_access_at(uid uuid, as_of timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  profile record;
  outstanding numeric := 0;
  unpaid_count int := 0;
  oa jsonb;
begin
  select mp.id, mp.company_questions_blocked into profile
  from public.member_profiles mp where mp.user_id = uid;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile', 'blocked_by_admin', false,
      'outstanding_fines', 0, 'unpaid_fine_count', 0, 'oa_required', false, 'oa_completed', false);
  end if;
  if not public.has_role_permission(uid, 'company_questions.use') then
    return jsonb_build_object('allowed', false, 'reason', 'role_restricted', 'blocked_by_admin', false,
      'outstanding_fines', 0, 'unpaid_fine_count', 0, 'oa_required', false, 'oa_completed', false);
  end if;
  select coalesce(sum(f.amount), 0), count(*) into outstanding, unpaid_count
  from public.member_fines f where f.member_id = profile.id and f.paid = false;
  oa := public.company_questions_oa_status(profile.id, as_of);
  return jsonb_build_object(
    'allowed', not profile.company_questions_blocked and outstanding <= 0
      and (not (oa->>'required')::boolean or (oa->>'completed')::boolean),
    'member_id', profile.id, 'blocked_by_admin', profile.company_questions_blocked,
    'outstanding_fines', outstanding, 'unpaid_fine_count', unpaid_count,
    'oa_required', (oa->>'required')::boolean, 'oa_exempt_reason', oa->>'exempt_reason',
    'oa_window_start', oa->>'window_start', 'oa_window_end', oa->>'window_end',
    'oa_completed', (oa->>'completed')::boolean, 'oa_completed_at', oa->>'submitted_at',
    'oa_override', oa->'override', 'evaluated_at', as_of
  );
end;
$$;

revoke all on function public.company_questions_access_at(uuid, timestamptz) from public, anon, authenticated;

commit;
