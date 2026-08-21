begin;

alter table public.member_profiles
  add column if not exists default_application_target integer not null default 40
  check (default_application_target between 0 and 1000);

-- Preserve the latest current-month values already chosen by admins.
update public.member_profiles p
set default_application_target = r.target_count
from public.application_requirements r
where r.user_id = p.user_id
  and r.month_start = date_trunc('month', current_date)::date;

update public.member_profiles
set default_application_target = 0
where member_status in ('Inactive', 'Alumni');

comment on column public.member_profiles.default_application_target is
  'Persistent monthly application target. Month-specific requirement rows override it.';

commit;
