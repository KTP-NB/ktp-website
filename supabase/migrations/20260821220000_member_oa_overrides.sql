-- Monthly OA compliance: the Super Admin override table plus the final shape of
-- the OA rule. Applied to the project in pieces while iterating; consolidated
-- here so a fresh environment reproduces the same behaviour.
--
-- Rules, in order of precedence:
--   1. A Super Admin's manual override wins over every exemption.
--   2. Only Active members are asked; super admins and non CS/DS majors are exempt.
--   3. Months before oa_start_month count as completed automatically.

create table if not exists public.member_oa_overrides (
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  month_start date not null,
  completed boolean not null,
  note text,
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (member_id, month_start)
);

comment on table public.member_oa_overrides is
  'Manual monthly OA credit set by a Super Admin. Read through security-definer functions and the admin API only.';

alter table public.member_oa_overrides enable row level security;
revoke all on public.member_oa_overrides from anon, authenticated;

create or replace function public.company_questions_oa_status(profile_id uuid, as_of timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  -- First month the requirement is judged on real CodeRank submissions.
  -- Before this, everyone counts as completed unless a Super Admin says
  -- otherwise, so the manual override already has teeth.
  oa_start_month constant date := date '2026-09-01';
  oa_window constant text := 'current-month';
  chapter_tz constant text := 'America/New_York';

  profile record;
  month_start date;
  window_start date;
  window_end date;
  exempt_reason text := null;
  submitted timestamptz := null;
  override_completed boolean := null;
  auto_credited boolean := false;
  required boolean;
  completed boolean;
begin
  select mp.id, mp.user_id, mp.major, mp.access_role, mp.member_status into profile
  from public.member_profiles mp where mp.id = profile_id;

  if not found then
    return jsonb_build_object('required', false, 'completed', false, 'exempt_reason', 'no_profile');
  end if;

  month_start := date_trunc('month', as_of at time zone chapter_tz)::date;

  -- Only active members are held to the monthly assessment.
  if coalesce(profile.member_status, '') <> 'Active' then
    exempt_reason := 'not_active';
  elsif profile.access_role = 'super_admin' then
    exempt_reason := 'super_admin';
  elsif coalesce(profile.major, '') !~* '(computer science|data science)' then
    exempt_reason := 'major';
  end if;

  if oa_window = 'previous-month' then
    window_start := (month_start - interval '1 month')::date;
  else
    window_start := month_start;
  end if;
  window_end := (window_start + interval '1 month')::date;

  if profile.user_id is not null then
    select max(a.submitted_at) into submitted
    from public.cr_attempts a
    where a.user_id = profile.user_id
      and a.status = 'submitted'
      and a.submitted_at >= (window_start::timestamp at time zone chapter_tz)
      and a.submitted_at < (window_end::timestamp at time zone chapter_tz);
  end if;

  select o.completed into override_completed
  from public.member_oa_overrides o
  where o.member_id = profile.id and o.month_start = window_start;

  auto_credited := window_start < oa_start_month and submitted is null and override_completed is null;

  -- A Super Admin marking someone by hand outranks every exemption: that is the
  -- whole point of the control, including for super admins themselves.
  required := exempt_reason is null or override_completed is not null;
  completed := coalesce(override_completed, submitted is not null or window_start < oa_start_month);

  return jsonb_build_object(
    'required', required,
    'exempt_reason', case when override_completed is not null then null else exempt_reason end,
    'window_start', window_start,
    'window_end', window_end,
    'submitted_at', submitted,
    'override', override_completed,
    'auto_credited', auto_credited,
    'completed', completed
  );
end;
$$;

revoke all on function public.company_questions_oa_status(uuid, timestamptz) from public, anon, authenticated;

-- Access check defers to the OA status function above.
create or replace function public.company_questions_access_at(uid uuid, as_of timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  profile record;
  outstanding numeric := 0;
  unpaid_count int := 0;
  oa jsonb;
begin
  select mp.id, mp.company_questions_blocked into profile
  from public.member_profiles mp where mp.user_id = uid;

  if not found then
    return jsonb_build_object(
      'allowed', false, 'reason', 'no_profile', 'blocked_by_admin', false,
      'outstanding_fines', 0, 'unpaid_fine_count', 0,
      'oa_required', false, 'oa_completed', false
    );
  end if;

  select coalesce(sum(f.amount), 0), count(*) into outstanding, unpaid_count
  from public.member_fines f
  where f.member_id = profile.id and f.paid = false;

  oa := public.company_questions_oa_status(profile.id, as_of);

  return jsonb_build_object(
    'allowed', not profile.company_questions_blocked
               and outstanding <= 0
               and (not (oa->>'required')::boolean or (oa->>'completed')::boolean),
    'member_id', profile.id,
    'blocked_by_admin', profile.company_questions_blocked,
    'outstanding_fines', outstanding,
    'unpaid_fine_count', unpaid_count,
    'oa_required', (oa->>'required')::boolean,
    'oa_exempt_reason', oa->>'exempt_reason',
    'oa_window_start', oa->>'window_start',
    'oa_window_end', oa->>'window_end',
    'oa_completed', (oa->>'completed')::boolean,
    'oa_completed_at', oa->>'submitted_at',
    'oa_override', oa->'override',
    'evaluated_at', as_of
  );
end;
$$;

revoke all on function public.company_questions_access_at(uuid, timestamptz) from public, anon, authenticated;

-- Roster for the admin portal's Monthly OA tab. Alumni are never listed.
create or replace function public.oa_compliance(as_of timestamptz)
returns table (
  member_id uuid,
  member_name text,
  major text,
  chapter_position text,
  pledge_class text,
  member_status text,
  access_role text,
  has_account boolean,
  status jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select mp.id, mp.name, mp.major, mp.position, mp.pledge_class, mp.member_status,
         mp.access_role, mp.user_id is not null,
         public.company_questions_oa_status(mp.id, as_of)
  from public.member_profiles mp
  where coalesce(mp.member_status, '') <> 'Alumni'
  order by mp.name;
$$;

revoke all on function public.oa_compliance(timestamptz) from public, anon, authenticated;
