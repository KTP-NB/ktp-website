-- Resumes move out of the publicly readable member_profiles table. A member
-- sees only their own; everyone else needs the resumes.manage grant that backs
-- the admin portal's Resumes tab.

/** Mirrors profileHasPermission() in lib/adminAccess.js for use inside RLS. */
create or replace function public.has_admin_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.member_profiles mp
    where mp.user_id = (select auth.uid())
      and (
        mp.access_role = 'super_admin'
        or (mp.access_role in ('admin', 'manager') and permission = any (mp.manager_permissions))
      )
  );
$$;

revoke all on function public.has_admin_permission(text) from public, anon;
grant execute on function public.has_admin_permission(text) to authenticated;

create table if not exists public.member_resumes (
  member_id uuid primary key references public.member_profiles(id) on delete cascade,
  url text,
  storage_path text,
  bucket text,
  updated_at timestamptz not null default now()
);

comment on table public.member_resumes is
  'Member resume pointers. Readable by the owning member and by holders of resumes.manage.';

insert into public.member_resumes (member_id, url, storage_path, bucket, updated_at)
select id, resume_url, resume_storage_path, resume_bucket, coalesce(updated_at, now())
from public.member_profiles
where resume_url is not null or resume_storage_path is not null
on conflict (member_id) do nothing;

alter table public.member_resumes enable row level security;

drop policy if exists "read own resume or with resumes.manage" on public.member_resumes;
create policy "read own resume or with resumes.manage"
on public.member_resumes
for select
to authenticated
using (
  exists (
    select 1 from public.member_profiles mp
    where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
  )
  or public.has_admin_permission('resumes.manage')
);

drop policy if exists "members write own resume" on public.member_resumes;
create policy "members write own resume"
on public.member_resumes
for all
to authenticated
using (
  exists (
    select 1 from public.member_profiles mp
    where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.member_profiles mp
    where mp.id = member_resumes.member_id and mp.user_id = (select auth.uid())
  )
);

alter table public.member_profiles
  drop column if exists resume_url,
  drop column if exists resume_storage_path,
  drop column if exists resume_bucket;
