begin;

alter table public.chapter_application_requirements
  add column if not exists fine_amount numeric(10, 2) not null default 0
    check (fine_amount >= 0 and fine_amount <= 10000);

comment on column public.chapter_application_requirements.fine_amount is
  'Fine assessed after this month ends for eligible active members who miss the chapter requirement. Defaults to zero for every month.';

alter table public.member_fines
  add column if not exists application_requirement_month date
    check (
      application_requirement_month is null
      or application_requirement_month = date_trunc('month', application_requirement_month)::date
    );

comment on column public.member_fines.application_requirement_month is
  'Reporting month that generated an automatic application-requirement fine. Null for manually entered fines.';

create unique index if not exists member_fines_application_month_unique
  on public.member_fines (member_id, application_requirement_month)
  ;

commit;
