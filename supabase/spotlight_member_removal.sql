begin;

-- Spotlight predates the checked-in migrations. Fail atomically on a different
-- schema instead of guessing how to alter existing post identities.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spotlight_posts'
      and column_name = 'id' and udt_name = 'uuid'
  ) then
    raise exception 'Expected public.spotlight_posts with a UUID id. Inspect the existing Spotlight schema before applying this migration.';
  end if;
end;
$$;

alter table public.spotlight_posts
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references auth.users(id) on delete set null;
alter table public.spotlight_posts alter column is_published set default true;
alter table public.spotlight_posts enable row level security;

-- Seed only when introducing the permission. Reapplying this migration must
-- preserve deliberate revocations made through Access Roles.
with added_permission as (
  insert into public.permission_definitions
    (permission_key, label, description, category, sort_order, editable)
  values ('spotlight.manage', 'Spotlight Management', 'Remove any member’s post from the Spotlight wall.', 'Administration', 155, true)
  on conflict (permission_key) do nothing
  returning permission_key
)
insert into public.role_permissions (role_key, permission_key)
select roles.role_key, added_permission.permission_key
from added_permission cross join (values ('admin'), ('super_admin')) roles(role_key)
on conflict do nothing;

revoke all on public.spotlight_posts from anon, authenticated;
-- RLS does not apply to TRUNCATE. Remove PUBLIC inheritance and fail safely if
-- a custom parent role still gives either application role this privilege.
revoke truncate on public.spotlight_posts from public;
do $$
begin
  if has_table_privilege('anon', 'public.spotlight_posts', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.spotlight_posts', 'TRUNCATE') then
    raise exception 'Inherited TRUNCATE access to spotlight_posts must be revoked from application roles before applying this migration.';
  end if;
end;
$$;
-- Table-level REVOKE does not remove historical column-level grants.
do $$
declare column_names text;
begin
  select string_agg(quote_ident(column_name), ', ') into column_names
  from information_schema.columns
  where table_schema = 'public' and table_name = 'spotlight_posts';
  execute format('revoke all (%s) on public.spotlight_posts from anon, authenticated', column_names);
end;
$$;
grant select on public.spotlight_posts to anon, authenticated;
grant insert (user_id, author_name, embed_url, embed_height, post_url, category)
  on public.spotlight_posts to authenticated;

drop policy if exists spotlight_public_read on public.spotlight_posts;
create policy spotlight_public_read on public.spotlight_posts
for select to anon, authenticated using (is_published and removed_at is null);

-- Restrictive policies also constrain unknown permissive historical policies
-- and inherited/PUBLIC grants. Archived records are never in the public feed.
drop policy if exists spotlight_published_only on public.spotlight_posts;
create policy spotlight_published_only on public.spotlight_posts as restrictive
for select to public using (is_published and removed_at is null);

drop policy if exists spotlight_member_insert on public.spotlight_posts;
create policy spotlight_member_insert on public.spotlight_posts
for insert to authenticated with check (true);

drop policy if exists spotlight_insert_guard on public.spotlight_posts;
create policy spotlight_insert_guard on public.spotlight_posts as restrictive
for insert to public with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.member_profiles mp where mp.user_id = (select auth.uid()))
  and is_published and removed_at is null and removed_by is null
  and coalesce(sort_order, 0) = 0
  and char_length(author_name) between 1 and 200
  and char_length(embed_url) <= 2048
  and embed_url ~ '^https://www[.]linkedin[.]com/embed/feed/update/urn:li:(activity|share|ugcPost):[0-9]+([?][^#[:space:]]*)?$'
  and embed_height between 300 and 1200
  and category in ('Company', 'Program', 'Event', 'Hackathon', 'Postgrad')
  and (post_url is null or post_url ~ '^https://www[.]linkedin[.]com/(feed/update/urn:li:(activity|share|ugcPost):[0-9]+|posts/[A-Za-z0-9_-]+)([?][^#[:space:]]*)?$')
);

drop policy if exists spotlight_no_direct_updates on public.spotlight_posts;
create policy spotlight_no_direct_updates on public.spotlight_posts as restrictive
for update to public using (false) with check (false);
drop policy if exists spotlight_no_direct_deletes on public.spotlight_posts;
create policy spotlight_no_direct_deletes on public.spotlight_posts as restrictive
for delete to public using (false);

create or replace function public.remove_spotlight_post(post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  spotlight public.spotlight_posts%rowtype;
begin
  if actor is null or not exists (select 1 from public.member_profiles mp where mp.user_id = actor) then
    raise exception 'You cannot remove this spotlight.' using errcode = '42501';
  end if;

  select s.* into spotlight from public.spotlight_posts s where s.id = post_id for update;
  if not found or (
    spotlight.user_id is distinct from actor
    and not public.has_role_permission(actor, 'spotlight.manage')
  ) then
    raise exception 'You cannot remove this spotlight.' using errcode = '42501';
  end if;

  if spotlight.is_published then
    update public.spotlight_posts
    set is_published = false, removed_at = clock_timestamp(), removed_by = actor
    where id = post_id;
  end if;
  return post_id;
end;
$$;

revoke all on function public.remove_spotlight_post(uuid) from public, anon;
grant execute on function public.remove_spotlight_post(uuid) to authenticated;

commit;
