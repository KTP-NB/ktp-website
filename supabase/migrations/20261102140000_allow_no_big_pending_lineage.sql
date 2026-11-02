begin;

-- No Big is a valid pending selection. The public view only registers members
-- connected to an established root, so clearing a Big cannot create a lineage.
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
  if new.big_member_id is null then return new; end if;
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

commit;
