begin;

drop policy if exists "study_tools_select_auth" on storage.objects;
create policy "study_tools_select_auth" on storage.objects
for select to authenticated
using (
  bucket_id = 'study-tools'
  and public.has_role_permission((select auth.uid()), 'study_tools.use')
);

drop policy if exists "study_tools_insert_auth" on storage.objects;
create policy "study_tools_insert_auth" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'study-tools'
  and public.has_role_permission((select auth.uid()), 'study_tools.use')
);

drop policy if exists "study_tools_update_auth" on storage.objects;
create policy "study_tools_update_auth" on storage.objects
for update to authenticated
using (
  bucket_id = 'study-tools'
  and public.has_role_permission((select auth.uid()), 'study_tools.use')
)
with check (
  bucket_id = 'study-tools'
  and public.has_role_permission((select auth.uid()), 'study_tools.use')
);

drop policy if exists "study_tools_delete_auth" on storage.objects;
create policy "study_tools_delete_auth" on storage.objects
for delete to authenticated
using (
  bucket_id = 'study-tools'
  and public.has_role_permission((select auth.uid()), 'study_tools.use')
);

drop policy if exists "Users can upload their own resumes" on storage.objects;
create policy "Users can upload their own resumes" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'member-resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.has_role_permission((select auth.uid()), 'resumes.use')
);

drop policy if exists "Users can update their own resumes" on storage.objects;
create policy "Users can update their own resumes" on storage.objects
for update to authenticated
using (
  bucket_id = 'member-resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.has_role_permission((select auth.uid()), 'resumes.use')
)
with check (
  bucket_id = 'member-resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.has_role_permission((select auth.uid()), 'resumes.use')
);

drop policy if exists "Users can delete their own resumes" on storage.objects;
create policy "Users can delete their own resumes" on storage.objects
for delete to authenticated
using (
  bucket_id = 'member-resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.has_role_permission((select auth.uid()), 'resumes.use')
);

drop policy if exists "members can upload own photos" on storage.objects;
create policy "members can upload own photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'member-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and public.has_role_permission((select auth.uid()), 'account.profile')
);

drop policy if exists "members can update own photos" on storage.objects;
create policy "members can update own photos" on storage.objects
for update to authenticated
using (
  bucket_id = 'member-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and public.has_role_permission((select auth.uid()), 'account.profile')
)
with check (
  bucket_id = 'member-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and public.has_role_permission((select auth.uid()), 'account.profile')
);

drop policy if exists "members can delete own photos" on storage.objects;
create policy "members can delete own photos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'member-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and public.has_role_permission((select auth.uid()), 'account.profile')
);

drop policy if exists "members can update own profile" on public.member_profiles;
create policy "members can update own profile" on public.member_profiles
for update to authenticated
using (
  (select auth.uid()) = user_id
  and public.has_role_permission((select auth.uid()), 'account.profile')
)
with check (
  (select auth.uid()) = user_id
  and public.has_role_permission((select auth.uid()), 'account.profile')
);

commit;
