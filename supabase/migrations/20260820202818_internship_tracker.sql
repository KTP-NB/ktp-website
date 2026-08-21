-- Fraternity internship and job application progress tracking.
-- Application counts are based exclusively on date_applied. Status changes do
-- not move an application between reporting months.

begin;

create table public.internship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(btrim(company)) between 1 and 160),
  position text not null check (char_length(btrim(position)) between 1 and 200),
  date_applied date not null default current_date,
  status text not null default 'applied'
    check (status in ('applied', 'assessment', 'interviewing', 'rejected', 'offer', 'withdrawn')),
  details text check (details is null or char_length(details) <= 5000),
  application_url text check (
    application_url is null
    or application_url = ''
    or application_url ~* '^https?://'
  ),
  referral boolean not null default false,
  referral_contact text check (referral_contact is null or char_length(referral_contact) <= 200),
  entry_source text not null default 'manual'
    check (entry_source in ('manual', 'spreadsheet_import', 'email', 'browser_extension')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.internship_applications is
  'Private member-owned internship and job application records used for monthly progress reporting.';
comment on column public.internship_applications.date_applied is
  'The original application date; this alone determines the reporting month.';

create index internship_applications_user_date_idx
  on public.internship_applications (user_id, date_applied desc);
create index internship_applications_user_status_idx
  on public.internship_applications (user_id, status);

create trigger internship_applications_set_updated_at
before update on public.internship_applications
for each row execute function public.set_updated_at();

alter table public.internship_applications enable row level security;

create policy "members read own internship applications"
  on public.internship_applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "members create own internship applications"
  on public.internship_applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "members update own internship applications"
  on public.internship_applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "members delete own internship applications"
  on public.internship_applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.internship_applications to authenticated;
revoke all on public.internship_applications from anon;

create table public.application_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null check (month_start = date_trunc('month', month_start)::date),
  target_count integer not null default 40 check (target_count between 0 and 1000),
  is_exempt boolean not null default false,
  exemption_reason text check (exemption_reason is null or char_length(exemption_reason) <= 1000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);

comment on table public.application_requirements is
  'Admin-managed monthly target overrides. Absence of a row means the chapter default of 40.';

create index application_requirements_user_month_idx
  on public.application_requirements (user_id, month_start desc);

create trigger application_requirements_set_updated_at
before update on public.application_requirements
for each row execute function public.set_updated_at();

alter table public.application_requirements enable row level security;

create policy "members read own application requirements"
  on public.application_requirements for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.application_requirements to authenticated;
revoke insert, update, delete on public.application_requirements from authenticated, anon;
revoke all on public.application_requirements from anon;

commit;
