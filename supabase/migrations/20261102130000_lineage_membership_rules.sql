begin;

alter table public.member_profiles
  add column lineage_root_kind text
    check (lineage_root_kind in ('founding', 'transfer', 'promoted'));

comment on column public.member_profiles.lineage_root_kind is
  'Server-managed root provenance: an original founding family, a Transfer-class root, or an inherited root after account removal.';

-- Preserve the original founding families, rather than turning every unlinked
-- profile into a new lineage. All future new lineages require Transfer class.
update public.member_profiles set lineage_root_kind = 'founding'
where big_member_id is null and lower(trim(pledge_class)) = 'founding'
  and replace(lower(trim(name)), 'priyanghsu bhowmik', 'priyangshu bhowmik') in (
    'shriya srinivasan', 'manan shah', 'aishwarya velagapudi',
    'priyangshu bhowmik', 'suhani mehra', 'srimathi vadivel',
    'akash puzhakkal', 'anushka kondur', 'ciera simon',
    'sameer jiandani', 'ananya ahlawat'
  );
update public.member_profiles set lineage_root_kind = 'transfer'
where lower(trim(pledge_class)) = 'transfer';

create or replace function public.ensure_transfer_lineage_root()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(20261102, 1);
  new.is_transfer_student := lower(trim(coalesce(new.pledge_class, ''))) = 'transfer';
  if new.is_transfer_student then
    new.big_member_id := null;
    new.lineage_root_kind := 'transfer';
  elsif new.big_member_id is not null or new.lineage_root_kind = 'transfer' then
    new.lineage_root_kind := null;
  end if;
  return new;
end;
$$;

create or replace function public.validate_member_big()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ancestor uuid;
  ancestor_root text;
  visited uuid[];
begin
  perform pg_advisory_xact_lock(20261102, 1);
  if new.big_member_id is null then
    -- Account creation may leave a profile pending; it does not create a
    -- lineage. Once joined, members cannot detach to manufacture a new root.
    if tg_op = 'UPDATE' then
      if old.big_member_id is not null
        and coalesce(new.lineage_root_kind, '') not in ('transfer', 'promoted') then
        raise exception 'Choose a Big. Only Transfer-class members can start a new lineage.' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.big_member_id is not distinct from old.big_member_id then return new; end if;
  end if;
  if not exists (
    select 1 from public.member_profiles
    where id = new.big_member_id and public_directory_visible
      and member_status in ('Active', 'Alumni')
  ) then
    raise exception 'Choose an available member as your Big.' using errcode = '23514';
  end if;

  ancestor := new.big_member_id;
  visited := array[new.id];
  while ancestor is not null loop
    if ancestor = any(visited) then
      raise exception 'Your Big cannot be yourself or one of your Littles. Lineage cannot contain a cycle.' using errcode = '23514';
    end if;
    visited := array_append(visited, ancestor);
    select big_member_id, lineage_root_kind into ancestor, ancestor_root
    from public.member_profiles where id = ancestor;
  end loop;
  if ancestor_root is null then
    raise exception 'Choose a Big who already belongs to a lineage.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.promote_member_littles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_big uuid;
begin
  perform pg_advisory_xact_lock(20261102, 1);
  with recursive ancestors as (
    select id, big_member_id, public_directory_visible, member_status, 1 as depth, array[old.id, id] as path
    from public.member_profiles where id = old.big_member_id
    union all
    select p.id, p.big_member_id, p.public_directory_visible, p.member_status, a.depth + 1, a.path || p.id
    from ancestors a join public.member_profiles p on p.id = a.big_member_id
    where not p.id = any(a.path)
  )
  select id into next_big from ancestors
  where public_directory_visible and member_status in ('Active', 'Alumni')
  order by depth limit 1;

  update public.member_profiles
  set big_member_id = next_big,
    lineage_root_kind = case when next_big is null then 'promoted' else null end
  where big_member_id = old.id;
  return old;
end;
$$;

revoke update (lineage_root_kind) on public.member_profiles from anon, authenticated;

create or replace view public.public_member_directory
with (security_barrier = true)
as
select
  mp.id, mp.name, mp.position, mp.image_path, mp.photo_url,
  mp.graduation_year, mp.major, mp.minors, mp.linkedin_url, mp.pledge_class,
  mp.member_status, mp.executive_board, mp.committees, mp.sort_order,
  (
    with recursive ancestors as (
      select p.id, p.big_member_id, p.public_directory_visible, p.member_status,
        1 as depth, array[mp.id, p.id] as path
      from public.member_profiles p where p.id = mp.big_member_id
      union all
      select p.id, p.big_member_id, p.public_directory_visible, p.member_status, a.depth + 1, a.path || p.id
      from ancestors a join public.member_profiles p on p.id = a.big_member_id
      where not p.id = any(a.path)
    )
    select id from ancestors
    where public_directory_visible and member_status in ('Active', 'Alumni')
    order by depth limit 1
  ) as big_member_id,
  mp.is_transfer_student,
  exists (
    with recursive family as (
      select mp.id, mp.big_member_id, mp.lineage_root_kind, array[mp.id] as path
      union all
      select p.id, p.big_member_id, p.lineage_root_kind, f.path || p.id
      from family f join public.member_profiles p on p.id = f.big_member_id
      where not p.id = any(f.path)
    )
    select 1 from family where lineage_root_kind is not null
  ) as lineage_registered
from public.member_profiles mp
where mp.public_directory_visible = true;

notify pgrst, 'reload schema';
commit;
