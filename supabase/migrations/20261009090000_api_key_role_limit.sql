begin;

-- A Super Admin may create a key that behaves as a lower access role, for
-- example to test what a pledge can reach or to hand an automation less than
-- full access. Null means the key simply follows its owner's own access.
alter table public.member_api_keys
  add column if not exists acts_as_role text references public.access_roles(role_key),
  add column if not exists acts_as_permissions text[] not null default '{}';

alter table public.member_api_keys
  drop constraint if exists member_api_keys_acts_as_permissions_check;
alter table public.member_api_keys
  add constraint member_api_keys_acts_as_permissions_check
  check (acts_as_permissions <@ array[
    'members.manage', 'resumes.manage', 'coderank.manage', 'applications.manage', 'fines.manage'
  ]::text[]);

comment on column public.member_api_keys.acts_as_role is
  'Optional role this key is limited to. Only honoured while the owner is a Super Admin.';
comment on column public.member_api_keys.acts_as_permissions is
  'Personal admin permissions granted to a key acting as admin or manager, mirroring member_profiles.manager_permissions.';

commit;
