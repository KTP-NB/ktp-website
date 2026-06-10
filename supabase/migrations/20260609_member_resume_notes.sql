-- Member resume review notes.
--
-- Context: admins (VP positions) review each member's resume and record feedback.
-- The member reads that feedback (read-only) on their own profile page. Notes must
-- be ADMIN-WRITABLE and MEMBER-READABLE-ONLY.
--
-- Members already read/update their own member_profiles row directly with the
-- anon-key client. To guarantee a member can never write notes, notes live in this
-- separate table with deny-by-default RLS: a SELECT-own policy lets a member read
-- their own notes, and the absence of any INSERT/UPDATE/DELETE policy means all
-- client writes are denied. Only the service-role client (used by the admin API
-- routes gated by requireAdmin) can write, since service-role bypasses RLS.

begin;

create table if not exists public.member_resume_notes (
  profile_id  uuid primary key references public.member_profiles(id) on delete cascade,
  user_id     uuid,                       -- member's auth user id; powers the SELECT RLS policy
  notes       text,
  updated_by  uuid,                       -- admin auth user id who last edited
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

create index if not exists member_resume_notes_user_id_idx
  on public.member_resume_notes (user_id);

alter table public.member_resume_notes enable row level security;

-- Members can read ONLY their own notes. No write policy ⇒ writes denied for all
-- non-service-role callers (service-role bypasses RLS in the admin API routes).
drop policy if exists "members read own resume notes" on public.member_resume_notes;
create policy "members read own resume notes"
  on public.member_resume_notes for select
  using (auth.uid() = user_id);

commit;
