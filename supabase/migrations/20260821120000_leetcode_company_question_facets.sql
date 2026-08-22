-- Distinct company/timeframe options for the member-only company questions page.
-- security_invoker keeps the caller's RLS in force, so only authenticated members can read it.
create or replace view public.leetcode_company_question_facets
with (security_invoker = true) as
select
  company,
  timeframe,
  count(*)::int as question_count
from public.leetcode_company_questions
group by company, timeframe;

grant select on public.leetcode_company_question_facets to authenticated;
