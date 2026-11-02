-- Run after migrations with: supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into public.member_profiles (id, name, email, source_key, member_status, pledge_class) values
  ('60000000-0000-4000-8000-000000000001', 'Lineage Root', 'lineage-root@example.invalid', 'lineage-test-root', 'Alumni', 'Transfer'),
  ('60000000-0000-4000-8000-000000000002', 'Lineage Big', 'lineage-big@example.invalid', 'lineage-test-big', 'Active', 'Alpha'),
  ('60000000-0000-4000-8000-000000000003', 'Lineage Little', 'lineage-little@example.invalid', 'lineage-test-little', 'Active', 'Beta'),
  ('60000000-0000-4000-8000-000000000004', 'Lineage Grandlittle', 'lineage-grandlittle@example.invalid', 'lineage-test-grandlittle', 'Active', 'Gamma'),
  ('60000000-0000-4000-8000-000000000005', 'Lineage Sibling', 'lineage-sibling@example.invalid', 'lineage-test-sibling', 'Active', 'Beta');

update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000001' where id = '60000000-0000-4000-8000-000000000002';
update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000002' where id in ('60000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000005');
update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000003' where id = '60000000-0000-4000-8000-000000000004';

select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), '60000000-0000-4000-8000-000000000002'::uuid, 'selecting a Big joins the public family');
select throws_ok($$update public.member_profiles set big_member_id = id where id = '60000000-0000-4000-8000-000000000003'$$, '23514', null, 'self-selection is rejected');
select throws_ok($$update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000004' where id = '60000000-0000-4000-8000-000000000002'$$, '23514', null, 'a multigeneration cycle is rejected');
select throws_ok($$update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000099' where id = '60000000-0000-4000-8000-000000000003'$$, '23514', null, 'nonexistent Bigs are rejected');

update public.member_profiles set member_status = 'Inactive' where id = '60000000-0000-4000-8000-000000000002';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), '60000000-0000-4000-8000-000000000001'::uuid, 'deactivation promotes a Little to their grand-Big');
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000005'), '60000000-0000-4000-8000-000000000001'::uuid, 'all Littles are promoted');
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000003'), '60000000-0000-4000-8000-000000000002'::uuid, 'deactivation preserves the original relationship');
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000004'), '60000000-0000-4000-8000-000000000003'::uuid, 'the Little retains their own descendants');
select throws_ok($$update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000002' where id = '60000000-0000-4000-8000-000000000004'$$, '23514', null, 'new selections cannot target an inactive Big');

update public.member_profiles set public_directory_visible = false where id = '60000000-0000-4000-8000-000000000001';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), null::uuid, 'multiple unavailable ancestors promote a Little into a root');
select throws_ok($$update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000001' where id = '60000000-0000-4000-8000-000000000004'$$, '23514', null, 'new selections cannot target a hidden Big');

set local role anon;
select is((select count(*) from public.public_member_directory where id = '60000000-0000-4000-8000-000000000001'), 0::bigint, 'anonymous readers cannot see the hidden ancestor');
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), null::uuid, 'anonymous readers never receive hidden ancestor IDs');
reset role;

update public.member_profiles set member_status = 'Active' where id = '60000000-0000-4000-8000-000000000002';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), '60000000-0000-4000-8000-000000000002'::uuid, 'reactivation restores the original family');
update public.member_profiles set public_directory_visible = true where id = '60000000-0000-4000-8000-000000000001';

delete from public.member_profiles where id = '60000000-0000-4000-8000-000000000002';
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000003'), '60000000-0000-4000-8000-000000000001'::uuid, 'permanent account removal reparents the Little');
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000005'), '60000000-0000-4000-8000-000000000001'::uuid, 'permanent account removal reparents every sibling');
delete from public.member_profiles where id = '60000000-0000-4000-8000-000000000001';
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000003'), null::uuid, 'deleting a root promotes its Littles to roots');
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000004'), '60000000-0000-4000-8000-000000000003'::uuid, 'root removal preserves deeper descendants');

update public.member_profiles set big_member_id = null where id = '60000000-0000-4000-8000-000000000004';
select is((select lineage_registered from public.public_member_directory where id = '60000000-0000-4000-8000-000000000004'), false, 'No Big returns a non-Transfer profile to pending status without creating a lineage');
select is((select lineage_root_kind from public.member_profiles where id = '60000000-0000-4000-8000-000000000003'), 'promoted', 'account removal preserves inherited root provenance');
select ok(has_column_privilege('authenticated', 'public.member_profiles', 'big_member_id', 'UPDATE'), 'members have permission to update their Big through the existing own-profile policy');
select ok(not has_column_privilege('anon', 'public.member_profiles', 'big_member_id', 'UPDATE'), 'anonymous visitors cannot edit Bigs');
select ok(not has_function_privilege('authenticated', 'public.promote_member_littles()', 'EXECUTE'), 'promotion is only callable by the delete trigger');
select ok(not has_function_privilege('anon', 'public.validate_member_big()', 'EXECUTE'), 'validation does not expose privileged profile reads');

update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000005' where id = '60000000-0000-4000-8000-000000000003';
update public.member_profiles set pledge_class = 'Transfer' where id = '60000000-0000-4000-8000-000000000003';
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000003'), null::uuid, 'marking a transfer student clears their previous Big');
update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000005' where id = '60000000-0000-4000-8000-000000000003';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), null::uuid, 'direct writes cannot attach a transfer student under another Big');
select is((select is_transfer_student from public.public_member_directory where id = '60000000-0000-4000-8000-000000000003'), true, 'the public directory identifies transfer roots');
update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000003' where id = '60000000-0000-4000-8000-000000000004';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000004'), '60000000-0000-4000-8000-000000000003'::uuid, 'transfer students can have Littles');
update public.member_profiles set member_status = 'Inactive' where id = '60000000-0000-4000-8000-000000000003';
select is((select big_member_id from public.public_member_directory where id = '60000000-0000-4000-8000-000000000004'), null::uuid, 'deactivated transfer roots promote their Littles to roots');
select ok(not has_column_privilege('authenticated', 'public.member_profiles', 'is_transfer_student', 'UPDATE'), 'members cannot independently change their class-derived transfer status');
update public.member_profiles set pledge_class = 'Transfer', big_member_id = '60000000-0000-4000-8000-000000000004' where id = '60000000-0000-4000-8000-000000000005';
select is((select is_transfer_student from public.member_profiles where id = '60000000-0000-4000-8000-000000000005'), true, 'Transfer pledge class automatically marks transfer students');
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000005'), null::uuid, 'Transfer pledge class automatically starts a new family');
update public.member_profiles set pledge_class = 'Beta', big_member_id = '60000000-0000-4000-8000-000000000004' where id = '60000000-0000-4000-8000-000000000005';
select is((select is_transfer_student from public.member_profiles where id = '60000000-0000-4000-8000-000000000005'), false, 'changing to a Greek class removes transfer status');
select is((select big_member_id from public.member_profiles where id = '60000000-0000-4000-8000-000000000005'), '60000000-0000-4000-8000-000000000004'::uuid, 'a Greek-class member can select a Big after class correction');
insert into public.member_profiles (id, name, email, source_key, member_status, pledge_class)
values ('60000000-0000-4000-8000-000000000006', 'Pending Lineage', 'pending-lineage@example.invalid', 'pending-lineage-test', 'Active', 'Beta');
select is((select lineage_registered from public.public_member_directory where id = '60000000-0000-4000-8000-000000000006'), false, 'unlinked Greek profiles do not automatically start lineages');
select throws_ok($$update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000006' where id = '60000000-0000-4000-8000-000000000005'$$, '23514', null, 'an unlinked profile cannot become a Big before joining a lineage');
select ok(not has_column_privilege('authenticated', 'public.member_profiles', 'lineage_root_kind', 'UPDATE'), 'members cannot grant themselves founding or promoted root status');
update public.member_profiles set big_member_id = null where id = '60000000-0000-4000-8000-000000000004';
select is((select lineage_registered from public.public_member_directory where id = '60000000-0000-4000-8000-000000000004'), false, 'an existing member can choose No Big without becoming a lineage root');
select is((select lineage_registered from public.public_member_directory where id = '60000000-0000-4000-8000-000000000005'), false, 'a detached branch does not create a new lineage through its Littles');
update public.member_profiles set member_status = 'Active' where id = '60000000-0000-4000-8000-000000000003';
update public.member_profiles set big_member_id = '60000000-0000-4000-8000-000000000003' where id = '60000000-0000-4000-8000-000000000004';
select is((select lineage_registered from public.public_member_directory where id = '60000000-0000-4000-8000-000000000005'), true, 'choosing a Big again restores the existing branch');

select * from finish();
rollback;
