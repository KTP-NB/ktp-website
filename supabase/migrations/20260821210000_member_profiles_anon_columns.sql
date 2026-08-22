-- The member directory is public, but the whole row was too: with the anon key
-- shipped in the browser bundle, anyone could read every member's email.
-- Signed-in members keep full read access; anonymous visitors get only the
-- columns the public directory renders.
revoke select on public.member_profiles from anon;

grant select (
  id,
  name,
  position,
  image_path,
  photo_url,
  graduation_year,
  major,
  minors,
  linkedin_url,
  pledge_class,
  member_status,
  executive_board,
  committees,
  sort_order
) on public.member_profiles to anon;
