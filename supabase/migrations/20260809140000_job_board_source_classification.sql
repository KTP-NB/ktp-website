-- Job Board Phase 5A hardening: source classification for registry controls.

begin;
alter table public.job_board_sources
  add column if not exists source_classification text not null default 'aggregate'
    check (source_classification in ('aggregate', 'specialized'));
update public.job_board_sources
set source_classification = case
    when provider = 'jobright' then 'specialized'
    else 'aggregate'
  end,
  updated_at = now()
where source_classification is null
   or source_classification not in ('aggregate', 'specialized');
create index if not exists job_board_sources_classification_idx
  on public.job_board_sources (source_classification);
commit;
