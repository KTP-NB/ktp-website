begin;

-- Browser clients only need member-owned CRUD on ordinary application fields.
-- API provenance stays writable exclusively through the service-role API.
revoke all on table public.internship_applications from anon, authenticated;

grant select, delete on table public.internship_applications to authenticated;
grant insert (
  user_id,
  company,
  position,
  date_applied,
  status,
  details,
  application_url,
  referral,
  referral_contact
) on public.internship_applications to authenticated;
grant update (
  company,
  position,
  date_applied,
  status,
  details,
  application_url,
  referral,
  referral_contact
) on public.internship_applications to authenticated;

create index if not exists application_api_audit_user_time_idx
  on public.application_api_audit_logs (user_id, created_at desc);

comment on column public.internship_applications.api_key_id is
  'Server-managed provenance. Browser clients cannot insert or update this column.';

commit;
