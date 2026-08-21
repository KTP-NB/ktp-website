begin;

create table if not exists public.chapter_application_requirements (
  month_start date primary key
    check (month_start = date_trunc('month', month_start)::date),
  default_target integer not null default 40
    check (default_target between 0 and 1000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chapter_application_requirements is
  'Chapter-wide application target for a reporting month. Missing months default to 40.';

create trigger chapter_application_requirements_set_updated_at
before update on public.chapter_application_requirements
for each row execute function public.set_updated_at();

alter table public.chapter_application_requirements enable row level security;

create policy "members read chapter application requirements"
  on public.chapter_application_requirements for select
  to authenticated
  using (true);

grant select on public.chapter_application_requirements to authenticated;
revoke insert, update, delete on public.chapter_application_requirements from authenticated, anon;
revoke all on public.chapter_application_requirements from anon;

alter table public.member_profiles
  add column if not exists uses_default_application_target boolean not null default true;

-- Existing non-40 values were explicitly assigned and must remain personal.
update public.member_profiles
set uses_default_application_target = false
where default_application_target <> 40
   or member_status in ('Inactive', 'Alumni');

insert into public.chapter_application_requirements (month_start, default_target)
values (date_trunc('month', current_date)::date, 40)
on conflict (month_start) do nothing;

comment on column public.member_profiles.uses_default_application_target is
  'When true, current/future targets inherit the selected month chapter default. When false, default_application_target is the persistent personal target.';

commit;
