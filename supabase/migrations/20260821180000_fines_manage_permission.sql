-- Register the fine tracker with the existing permission list so a Super Admin
-- can grant it from Member Management like every other admin portal tab.
alter table public.member_profiles
  drop constraint if exists member_profiles_manager_permissions_check;

alter table public.member_profiles
  add constraint member_profiles_manager_permissions_check
  check (manager_permissions <@ array[
    'members.manage',
    'resumes.manage',
    'coderank.manage',
    'applications.manage',
    'fines.manage'
  ]::text[]);

comment on column public.member_profiles.manager_permissions is
  'Admin portal tabs a Super Admin granted to this account. Applies to the admin and manager roles; super admins see everything.';
