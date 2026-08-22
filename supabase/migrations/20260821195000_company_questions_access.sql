-- Eligibility for the LC Company Tagged pages.
--
-- A member keeps access while all three hold:
--   1. a Super Admin has not blocked them by hand,
--   2. they owe nothing on the fine tracker,
--   3. they met the monthly OA requirement (or are exempt from it).
--
-- Enforced in RLS so the rule holds for anyone querying the table directly with
-- their own JWT, not just through the UI.

-- Super Admin kill switch, editable only through the admin API.
alter table public.member_profiles
  add column if not exists company_questions_blocked boolean not null default false;

comment on column public.member_profiles.company_questions_blocked is
  'Super Admin override that revokes LC Company Tagged access regardless of fines or OA status.';

-- Members may edit their own profile, but never the columns that decide
-- authorization. Without this a member can PATCH their own row over PostgREST
-- and grant themselves super_admin, a chapter position, or lift their own
-- block. Column-level grants only bite once the table-wide UPDATE is gone.
revoke update on public.member_profiles from authenticated, anon;

grant update (
  name,
  graduation_year,
  major,
  minors,
  linkedin_url,
  photo_url,
  photo_storage_path,
  resume_url,
  resume_storage_path,
  resume_bucket,
  updated_at
) on public.member_profiles to authenticated;

/**
 * Access state for one member at a point in time, as jsonb so the UI can
 * explain exactly which rule is failing.
 *
 * The two knobs for the OA rule live here:
 *   oa_start_month - first month the requirement applies (2026-09).
 *   oa_window      - 'current-month' (must complete one this month) or
 *                    'previous-month' (judged on the month just ended).
 */
create or replace function public.company_questions_access_at(uid uuid, as_of timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  oa_start_month constant date := date '2026-09-01';
  oa_window constant text := 'current-month';
  chapter_tz constant text := 'America/New_York';

  profile record;
  month_start date;
  window_start date;
  window_end date;
  outstanding numeric := 0;
  unpaid_count int := 0;
  oa_required boolean := false;
  oa_exempt_reason text := null;
  oa_completed_at timestamptz := null;
begin
  select mp.id, mp.name, mp.major, mp.access_role, mp.member_status, mp.company_questions_blocked
    into profile
  from public.member_profiles mp
  where mp.user_id = uid;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'no_profile',
      'blocked_by_admin', false,
      'outstanding_fines', 0,
      'unpaid_fine_count', 0,
      'oa_required', false,
      'oa_completed', false
    );
  end if;

  month_start := date_trunc('month', as_of at time zone chapter_tz)::date;

  select coalesce(sum(f.amount), 0), count(*)
    into outstanding, unpaid_count
  from public.member_fines f
  where f.member_id = profile.id
    and f.paid = false;

  -- Super admins run the program; non CS / Data Science majors are not held to
  -- the coding assessment.
  if profile.access_role = 'super_admin' then
    oa_exempt_reason := 'super_admin';
  elsif coalesce(profile.major, '') !~* '(computer science|data science)' then
    oa_exempt_reason := 'major';
  elsif month_start < oa_start_month then
    oa_exempt_reason := 'not_started';
  end if;

  if oa_exempt_reason is null then
    oa_required := true;
    if oa_window = 'previous-month' then
      window_start := (month_start - interval '1 month')::date;
      window_end := month_start;
    else
      window_start := month_start;
      window_end := (month_start + interval '1 month')::date;
    end if;

    select max(a.submitted_at) into oa_completed_at
    from public.cr_attempts a
    where a.user_id = uid
      and a.status = 'submitted'
      and a.submitted_at >= (window_start::timestamp at time zone chapter_tz)
      and a.submitted_at < (window_end::timestamp at time zone chapter_tz);
  end if;

  return jsonb_build_object(
    'allowed', not profile.company_questions_blocked
               and outstanding <= 0
               and (not oa_required or oa_completed_at is not null),
    'member_id', profile.id,
    'blocked_by_admin', profile.company_questions_blocked,
    'outstanding_fines', outstanding,
    'unpaid_fine_count', unpaid_count,
    'oa_required', oa_required,
    'oa_exempt_reason', oa_exempt_reason,
    'oa_window_start', window_start,
    'oa_window_end', window_end,
    'oa_completed', oa_completed_at is not null,
    'oa_completed_at', oa_completed_at,
    'evaluated_at', as_of
  );
end;
$$;

-- Only the server (service role) may ask about an arbitrary member; signed-in
-- users go through the no-argument wrapper, which can only report on itself.
revoke all on function public.company_questions_access_at(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.company_questions_access()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.company_questions_access_at((select auth.uid()), now());
$$;

create or replace function public.company_questions_allowed()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (public.company_questions_access_at((select auth.uid()), now())->>'allowed')::boolean,
    false
  );
$$;

-- Functions default to EXECUTE for PUBLIC; keep them to signed-in members.
revoke all on function public.company_questions_access() from public, anon;
revoke all on function public.company_questions_allowed() from public, anon;
grant execute on function public.company_questions_access() to authenticated;
grant execute on function public.company_questions_allowed() to authenticated;

-- Gate the data itself, not just the page.
drop policy if exists authenticated_read_leetcode_company_questions on public.leetcode_company_questions;
create policy authenticated_read_leetcode_company_questions
on public.leetcode_company_questions
for select
to authenticated
using (public.company_questions_allowed());
