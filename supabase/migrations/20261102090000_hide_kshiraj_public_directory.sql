-- Remove this profile from the public website while preserving member records.
update public.member_profiles
set public_directory_visible = false
where lower(trim(name)) = 'kshiraj gupta';
