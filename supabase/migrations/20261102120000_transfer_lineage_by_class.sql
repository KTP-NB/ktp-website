begin;

-- Transfer is a pledge class, not an independently editable profile choice.
create or replace function public.ensure_transfer_lineage_root()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(20261102, 1);
  new.is_transfer_student := lower(trim(coalesce(new.pledge_class, ''))) = 'transfer';
  if new.is_transfer_student then new.big_member_id := null; end if;
  return new;
end;
$$;

update public.member_profiles
set is_transfer_student = lower(trim(coalesce(pledge_class, ''))) = 'transfer'
where is_transfer_student is distinct from (lower(trim(coalesce(pledge_class, ''))) = 'transfer');

revoke update (is_transfer_student) on public.member_profiles from authenticated;
comment on column public.member_profiles.is_transfer_student is
  'Derived from pledge_class = Transfer. Transfer members start a new lineage; members cannot edit this flag independently.';

commit;
