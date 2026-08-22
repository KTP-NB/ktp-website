-- Chapter fine tracker. Replaces the "Fine Log" / "Members" spreadsheet: each
-- row here is one fine log entry, and every per-member total the spreadsheet
-- computed with COUNTIF/SUMIF is derived from these rows at read time.
create table if not exists public.member_fines (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  date_issued date not null default current_date,
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  due_date date,
  paid boolean not null default false,
  paid_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_fines_member_idx on public.member_fines (member_id);
create index if not exists member_fines_date_issued_idx on public.member_fines (date_issued desc);
create index if not exists member_fines_unpaid_idx on public.member_fines (paid) where paid = false;

drop trigger if exists member_fines_set_updated_at on public.member_fines;
create trigger member_fines_set_updated_at
before update on public.member_fines
for each row execute function public.set_updated_at();

alter table public.member_fines enable row level security;

-- Members read their own fines and nothing else. All writes go through the
-- admin API with the service-role key, which is gated on VP of Finance /
-- super_admin, so no write policy is granted here.
drop policy if exists "members read own fines" on public.member_fines;
create policy "members read own fines"
on public.member_fines
for select
to authenticated
using (
  exists (
    select 1
    from public.member_profiles mp
    where mp.id = member_fines.member_id
      and mp.user_id = (select auth.uid())
  )
);

-- Carry over the two entries that were already in the spreadsheet's Fine Log.
insert into public.member_fines (member_id, date_issued, description, amount, due_date, paid, paid_on)
select mp.id, date '2026-07-23', 'Transcript Submissions', 10.00, date '2026-08-23', seed.paid,
       case when seed.paid then date '2026-07-23' else null end
from (values ('Arnav Venkata', true), ('Kshiraj Gupta', false)) as seed(name, paid)
join public.member_profiles mp on mp.name = seed.name
where not exists (
  select 1 from public.member_fines existing
  where existing.member_id = mp.id
    and existing.date_issued = date '2026-07-23'
    and existing.description = 'Transcript Submissions'
);
