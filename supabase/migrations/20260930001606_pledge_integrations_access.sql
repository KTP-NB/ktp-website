-- Pledges can create personal API keys so they can log applications through
-- the application API, not just the web tracker.
insert into public.role_permissions (role_key, permission_key)
values ('pledge', 'integrations.use')
on conflict do nothing;
