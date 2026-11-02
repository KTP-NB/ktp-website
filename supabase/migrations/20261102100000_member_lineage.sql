begin;

alter table public.member_profiles
  add column big_member_id uuid references public.member_profiles(id) on delete set null,
  add constraint member_profiles_big_not_self check (big_member_id is distinct from id);

create index member_profiles_big_idx on public.member_profiles(big_member_id);
grant update (big_member_id) on public.member_profiles to authenticated;
comment on column public.member_profiles.big_member_id is
  'The member-selected Big. The public directory skips inactive or hidden ancestors without losing the original relationship.';

-- Preserve existing families using unambiguous full-name matches. If an old
-- Big has already been removed, seed the next existing ancestor instead.
with recursive legacy(little_name, big_name) as (values
  ('Aditi Sreeganesh', 'Shriya Srinivasan'),
  ('Gravit Bali', 'Aditi Sreeganesh'),
  ('Kesha Patel', 'Shriya Srinivasan'),
  ('Anant Gupta', 'Manan Shah'),
  ('Darsh Sundar', 'Manan Shah'),
  ('Shiven Patel', 'Aishwarya Velagapudi'),
  ('Jignasu Shah', 'Shiven Patel'),
  ('Krish Patel', 'Jignasu Shah'),
  ('Advitya Suri', 'Jignasu Shah'),
  ('Heet Shah', 'Shiven Patel'),
  ('Vedavyas Painoori', 'Heet Shah'),
  ('Raghul Srinivasan', 'Aishwarya Velagapudi'),
  ('Gokulraj Kumarassamy', 'Raghul Srinivasan'),
  ('Radha Ghate', 'Aishwarya Velagapudi'),
  ('Srinidhi Pappu', 'Radha Ghate'),
  ('Yugal Shah', 'Priyangshu Bhowmik'),
  ('Sujay Faldu', 'Yugal Shah'),
  ('Anish Allada', 'Sujay Faldu'),
  ('Nayan Yadav', 'Yugal Shah'),
  ('Gourika Dhiman', 'Suhani Mehra'),
  ('Mira Kehair', 'Gourika Dhiman'),
  ('Aaron Bansal', 'Suhani Mehra'),
  ('Yash Singh', 'Srimathi Vadivel'),
  ('Jayden Shah', 'Yash Singh'),
  ('Aditya Velagapudi', 'Yash Singh'),
  ('Anusha Iyer', 'Yash Singh'),
  ('Priya Rana', 'Srimathi Vadivel'),
  ('Anvi Khambadkone', 'Priya Rana'),
  ('Esha Pai', 'Srimathi Vadivel'),
  ('Jyothika Akkineni', 'Esha Pai'),
  ('Godasrita Dintakurti', 'Esha Pai'),
  ('Saatvik Kabra', 'Akash Puzhakkal'),
  ('Krisha Bhagat', 'Saatvik Kabra'),
  ('Kaivalya Atigre', 'Saatvik Kabra'),
  ('Krish Kharbanda', 'Akash Puzhakkal'),
  ('Atul Marichetty', 'Krish Kharbanda'),
  ('Krish Bansal', 'Krish Kharbanda'),
  ('Akhil Thuremella', 'Anushka Kondur'),
  ('Krish Maske', 'Akhil Thuremella'),
  ('Abirami Jayakumar', 'Ciera Simon'),
  ('Abhiram Sajjala', 'Abirami Jayakumar'),
  ('Umair Siddiqui', 'Ananya Ahlawat'),
  ('Ethan Bingemann', 'Umair Siddiqui'),
  ('Arnav Venkata', 'Umair Siddiqui')
), named_profiles as (
  select id,
    replace(regexp_replace(lower(trim(name)), '\s+', ' ', 'g'), 'priyanghsu bhowmik', 'priyangshu bhowmik') as canonical_name
  from public.member_profiles
), unique_profiles as (
  select canonical_name, (array_agg(id))[1] as id
  from named_profiles group by canonical_name having count(*) = 1
), ancestor_names as (
  select little_name, big_name, 1 as depth, array[little_name, big_name] as path from legacy
  union all
  select a.little_name, l.big_name, a.depth + 1, a.path || l.big_name
  from ancestor_names a join legacy l on l.little_name = a.big_name
  where not l.big_name = any(a.path)
), resolved as (
  select distinct on (child.id) child.id as little_id, big.id as big_id
  from ancestor_names a
  join unique_profiles child on child.canonical_name = lower(a.little_name)
  join unique_profiles big on big.canonical_name = lower(a.big_name)
  order by child.id, a.depth
)
update public.member_profiles little
set big_member_id = resolved.big_id
from resolved
where little.id = resolved.little_id and little.big_member_id is null;

create function public.validate_member_big()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ancestor uuid;
  visited uuid[];
begin
  -- Serialize relationship changes so concurrent reciprocal selections cannot
  -- create a cycle. Status/visibility changes use the same lock.
  perform pg_advisory_xact_lock(20261102, 1);
  if tg_op = 'UPDATE' then
    if new.big_member_id is not distinct from old.big_member_id then return new; end if;
  end if;
  if new.big_member_id is null then return new; end if;

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
    select big_member_id into ancestor from public.member_profiles where id = ancestor;
  end loop;
  return new;
end;
$$;

revoke all on function public.validate_member_big() from public, anon, authenticated;
create trigger member_profiles_validate_big
before insert or update of big_member_id, member_status, public_directory_visible on public.member_profiles
for each row execute function public.validate_member_big();

-- A permanently removed account must not orphan its Littles. Deactivation is
-- handled by the view below, retaining the original link if it is reactivated.
create function public.promote_member_littles()
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

  update public.member_profiles set big_member_id = next_big where big_member_id = old.id;
  return old;
end;
$$;

revoke all on function public.promote_member_littles() from public, anon, authenticated;
create trigger member_profiles_promote_littles
before delete on public.member_profiles
for each row execute function public.promote_member_littles();

-- Expose only the nearest public, non-inactive ancestor's ID. Hidden profiles'
-- names, IDs, and photos are never returned to public clients during promotion.
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
  ) as big_member_id
from public.member_profiles mp
where mp.public_directory_visible = true;

comment on view public.public_member_directory is
  'Public-safe member directory with lineage automatically promoted past hidden and inactive Bigs.';

commit;
