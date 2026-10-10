# KTP New Brunswick MCP

Stateless Streamable HTTP MCP server hosted as a Supabase Edge Function. It wraps the existing KTP API routes (member and admin) so API-key authentication, permissions, ownership, validation, rate limits, deduplication, and audit logs remain centralized in Next.js.

## Environment

`KTP_API_BASE_URL` is optional and defaults to `https://www.ktpnewbrunswick.org`. Set it to a local Next.js URL when testing locally.

## Local serving

```powershell
npx supabase functions serve --no-verify-jwt ktp-new-brunswick-mcp --env-file supabase/functions/.env.local
```

Endpoint:

```text
http://localhost:54321/functions/v1/ktp-new-brunswick-mcp/mcp
```

The MCP client must send:

```http
Authorization: Bearer ktp_live_your_key
```

## Production deployment

```powershell
npx supabase functions deploy --no-verify-jwt ktp-new-brunswick-mcp
```

Production endpoint:

```text
https://tagpabkdkbyjfmexikxn.supabase.co/functions/v1/ktp-new-brunswick-mcp/mcp
```

## Access model

A key acts as its owner. On every MCP request the server calls `GET /api/v1/me` to read the owner's access role and permissions (role permissions plus personal `manager_permissions`), and only registers the tools those permissions allow. That filtering is presentation only: every tool calls a KTP API route, and the route re-checks the same permission, so nothing here grants access.

- A Read-only key can call tools that view data. Anything that changes data needs the Write scope.
- Super-admin-only tools are registered only for Super Admins, and the API enforces the same rule.
- A Super Admin can create a key that acts as a lower role (pledge, member, manager, admin). It gets exactly that role's permissions, still acts on the owner's own account, and stops working if the owner is no longer a Super Admin.
- Standing rules still apply through a key: company questions need no unpaid fines, the monthly OA and no admin block; the referral finder needs no unpaid fines.
- Taking CodeRank assessments and managing API keys are website-only and have no tools.

Deploy the Next.js site before this function: the admin tools rely on the site's admin routes accepting API keys.

## Tools

| Permission | Tools |
|---|---|
| (any key) | `get_my_profile` |
| `account.profile` | `get_my_profile_details`, `update_my_profile_details`, `list_member_directory` |
| `referral_finder.use` | `find_referrals` (locked while fines are unpaid) |
| `applications.use` (job board) | `search_jobs`, `get_job`, `list_saved_jobs`, `save_job`, `unsave_job`, `list_job_notifications`, `mark_job_notifications_read`, `get_job_notification_preferences`, `update_job_notification_preferences` |
| `applications.use` | `list_applications`, `get_application`, `add_application`, `add_applications_bulk`, `update_application`, `get_application_progress` |
| `fines.view` | `get_my_fines` |
| `resumes.use` | `get_my_resume` |
| `coderank.take` | `list_my_assessments` |
| `company_questions.use` | `list_company_question_companies`, `list_company_questions` |
| `study_tools.use` | `list_study_files` |
| `members.manage` | `admin_list_members`, `admin_invite_member`, `admin_update_member`, `admin_list_invite_links`, `admin_create_invite_link` |
| `roles.manage` | `admin_get_role_permissions` |
| `fines.manage` | `admin_fines_overview`, `admin_create_fine`, `admin_update_fine`, `admin_delete_fine` |
| `applications.manage` | `admin_applications_overview`, `admin_get_member_applications`, `admin_set_member_application_target`, `admin_get_application_settings`, `admin_set_application_settings`, `admin_process_application_fines`, `admin_job_board_overview`, `admin_list_job_sources`, `admin_set_job_source_enabled`, `admin_run_job_ingestion`, `admin_generate_job_digest`, `admin_archive_job_postings` |
| `coderank.manage` | `admin_list_assessments`, `admin_get_assessment`, `admin_list_coderank_questions`, `admin_create_assessment`, `admin_update_assessment`, `admin_set_assessment_questions`, `admin_set_assessment_assignments`, `admin_delete_assessment`, `admin_get_assessment_results`, `admin_rerun_submission`, `admin_oa_compliance`, `admin_get_member_review`, `admin_set_resume_notes` |
| `resumes.manage` | `admin_list_resumes` |
| Super Admin | `admin_list_alumni`, `admin_update_alumni_contacts`, `admin_set_member_access`, `admin_remove_member`, `admin_set_role_permissions`, `admin_set_oa_credit` |
