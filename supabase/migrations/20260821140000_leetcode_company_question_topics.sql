-- Distinct topic tags per company/timeframe, for the topic filter on the
-- member-only company questions page. security_invoker keeps the caller's RLS
-- in force, so only authenticated members can read it.
create or replace view public.leetcode_company_question_topics
with (security_invoker = true) as
select
  q.company,
  q.timeframe,
  tag->>'slug' as topic_slug,
  tag->>'name' as topic_name,
  count(*)::int as question_count
from public.leetcode_company_questions q
cross join lateral jsonb_array_elements(q.topic_tags) as tag
group by q.company, q.timeframe, tag->>'slug', tag->>'name';

grant select on public.leetcode_company_question_topics to authenticated;
