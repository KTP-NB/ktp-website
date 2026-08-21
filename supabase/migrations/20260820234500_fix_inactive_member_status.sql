begin;

-- The original schema used member_profiles_status_check. The roles migration
-- added a correctly named constraint but did not remove this legacy one.
alter table public.member_profiles
  drop constraint if exists member_profiles_status_check;

alter table public.member_profiles
  drop constraint if exists member_profiles_member_status_check;

alter table public.member_profiles
  add constraint member_profiles_member_status_check
  check (member_status in ('Active', 'Inactive', 'Alumni'));

commit;
