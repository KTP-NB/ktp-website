begin;

insert into public.application_requirements
  (user_id, month_start, target_count, is_exempt, exemption_reason)
select user_id, date_trunc('month', current_date)::date, 0, false, null
from public.member_profiles
where member_status in ('Inactive', 'Alumni') and user_id is not null
on conflict (user_id, month_start)
do update set target_count = 0, is_exempt = false,
  exemption_reason = null, updated_at = now();

commit;
