begin;

-- A requirement row now means an explicit member/month override. Remove rows
-- that merely duplicated the member baseline so those months keep following
-- future baseline changes.
delete from public.application_requirements r
using public.member_profiles p
where r.user_id = p.user_id
  and r.target_count = case
    when p.member_status in ('Inactive', 'Alumni') then 0
    when p.uses_default_application_target then coalesce(
      (select c.default_target
       from public.chapter_application_requirements c
       where c.month_start = r.month_start),
      40
    )
    else p.default_application_target
  end;

comment on table public.application_requirements is
  'Explicit member/month target overrides. Absence of a row means use the member baseline, which may inherit the chapter default.';

commit;
