begin;

alter table public.member_profiles
  add column is_transfer_student boolean not null default false,
  add constraint member_profiles_transfer_starts_lineage
    check (not is_transfer_student or big_member_id is null);

grant update (is_transfer_student) on public.member_profiles to authenticated;
comment on column public.member_profiles.is_transfer_student is
  'Transfer students start a new lineage and have no Big in this chapter.';

create function public.ensure_transfer_lineage_root()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(20261102, 1);
  if new.is_transfer_student or lower(trim(coalesce(new.pledge_class, ''))) = 'transfer' then
    new.is_transfer_student := true;
    new.big_member_id := null;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_transfer_lineage_root() from public, anon, authenticated;
-- Alphabetical trigger order clears the Big before validate_member_big runs.
create trigger member_profiles_transfer_root
before insert or update of is_transfer_student, big_member_id, pledge_class on public.member_profiles
for each row execute function public.ensure_transfer_lineage_root();

update public.member_profiles set is_transfer_student = true
where lower(trim(coalesce(pledge_class, ''))) = 'transfer';

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
  mp.is_transfer_student
from public.member_profiles mp
where mp.public_directory_visible = true;

commit;
