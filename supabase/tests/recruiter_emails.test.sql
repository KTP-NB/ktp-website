-- Run against the local database with: supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'outreach-test-one@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'outreach-test-two@example.invalid');
insert into public.member_profiles (user_id, name, email, access_role, member_status, source_key) values
  ('10000000-0000-4000-8000-000000000001', 'Outreach Test One', 'outreach-test-one@example.invalid', 'member', 'Active', 'outreach-test-one'),
  ('10000000-0000-4000-8000-000000000002', 'Outreach Test Two', 'outreach-test-two@example.invalid', 'member', 'Active', 'outreach-test-two');
insert into public.role_permissions (role_key, permission_key) values ('member', 'recruiter_emails.use') on conflict do nothing;

insert into public.recruiter_emails (user_id, recipients, company, sent_at, provider, mailbox_id, message_id, thread_id, entry_source) values
  ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"},{"email":"sam@example.com"}]', 'First company', '2026-10-20T10:00:00Z', 'gmail', 'mailbox-one', 'message-one', 'thread-one', 'email'),
  ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"}]', 'Follow-up', '2026-10-21T10:00:00Z', 'gmail', 'mailbox-one', 'message-two', 'thread-one', 'email'),
  ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"}]', 'Other mailbox', '2026-10-22T10:00:00Z', 'gmail', 'mailbox-two', 'message-one', null, 'email'),
  ('10000000-0000-4000-8000-000000000002', '[{"email":"other@example.com"}]', 'Other owner', '2026-10-20T10:00:00Z', 'gmail', 'mailbox-one', 'message-one', null, 'email');

select is((select count(*) from public.recruiter_emails where user_id = '10000000-0000-4000-8000-000000000001'), 3::bigint, 'follow-ups and the same message in a different mailbox remain distinct');
select is(public.recruiter_email_summary('10000000-0000-4000-8000-000000000001', null, null, null), '{"emails":3,"recruiters":2}'::jsonb, 'summary counts emails separately from unique recipients and isolates owners');
select is(public.recruiter_email_summary('10000000-0000-4000-8000-000000000001', '%Follow-up%', '2026-10-21', '2026-10-22'), '{"emails":1,"recruiters":1}'::jsonb, 'summary applies search and date filters');
select throws_ok($$
  insert into public.recruiter_emails (user_id, recipients, sent_at, provider, mailbox_id, message_id, entry_source)
  values ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"}]', now(), 'gmail', 'mailbox-one', 'message-one', 'email')
$$, '23505', null, 'the database rejects the same owner/provider/mailbox/message identity');
select throws_ok($$
  insert into public.recruiter_emails (user_id, recipients, sent_at, provider, message_id, entry_source)
  values ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"}]', now(), 'gmail', 'incomplete', 'email')
$$, '23514', null, 'the database rejects incomplete import identities');
select throws_ok($$
  insert into public.recruiter_emails (user_id, recipients, sent_at, entry_source)
  values ('10000000-0000-4000-8000-000000000001', '[]', now(), 'manual')
$$, '23514', null, 'visible emails require a recipient');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*) from public.recruiter_emails), 3::bigint, 'RLS only exposes the authenticated owner');
select throws_ok($$
  update public.recruiter_emails set notes = 'direct write'
$$, '42501', null, 'authenticated clients cannot bypass API update validation');
select throws_ok($$
  delete from public.recruiter_emails
$$, '42501', null, 'authenticated clients cannot bypass API deletion suppression');
select ok(not has_function_privilege(current_user, 'public.recruiter_email_summary(uuid,text,timestamptz,timestamptz)', 'EXECUTE'),
  'clients cannot call the service-only aggregate for another account');
reset role;

update public.recruiter_emails set deleted_at = now(), recipients = '[]', company = null, position = null,
  subject = null, notes = null, thread_id = null, source_url = null, sent_at = '1970-01-01T00:00:00Z'
where user_id = '10000000-0000-4000-8000-000000000001' and mailbox_id = 'mailbox-one' and message_id = 'message-one';
select throws_ok($$
  insert into public.recruiter_emails (user_id, recipients, sent_at, provider, mailbox_id, message_id, entry_source)
  values ('10000000-0000-4000-8000-000000000001', '[{"email":"alex@example.com"}]', now(), 'gmail', 'mailbox-one', 'message-one', 'email')
$$, '23505', null, 'deleted imports still reserve their identity');
select is(public.recruiter_email_summary('10000000-0000-4000-8000-000000000001', null, null, null), '{"emails":2,"recruiters":1}'::jsonb, 'deleted imports and their recipients disappear from totals');

set local role authenticated;
select is((select count(*) from public.recruiter_emails), 2::bigint, 'RLS hides source tombstones');
reset role;
delete from public.role_permissions where role_key = 'member' and permission_key = 'recruiter_emails.use';
set local role authenticated;
select is((select count(*) from public.recruiter_emails), 0::bigint, 'revoked feature permissions remove direct read access');
reset role;
set local role anon;
select throws_ok($$
  select * from public.recruiter_emails
$$, '42501', null, 'anonymous clients cannot read outreach');
reset role;

select * from finish();
rollback;
