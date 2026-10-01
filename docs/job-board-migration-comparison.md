# Job Board Migration Comparison

Read-only comparison on 2026-09-26 against linked project `tagpabkdkbyjfmexikxn`. No existing table or migration-history row was changed for this comparison.

## Findings

- `supabase migration list` showed 28 remote-only website migration versions from 2026-08-20 through 2026-08-22. Every original SQL blob is recoverable from Git history. The Project 2 `main` tree still contains some of those files.
- This integration branch also has 20 local-only website migration files under different timestamps, including two files sharing version `20260821210000`. The versions are not interchangeable just because their names are similar: the remote member-role migration resets all roles to `member`, whereas the local rewrite only promotes named admins.
- A schema-only remote dump confirms the existing `internship_applications`, `member_resumes`, `member_fines`, `job_board_sources`, and `public_member_directory` objects. The live `member_profiles.access_role` check includes `pledge`, `member`, `manager`, `admin`, and `super_admin`.
- `supabase db push --dry-run` from the integration branch stops on the remote-only history. It must not be followed by a blanket `migration repair --status reverted`, which would misrepresent applied production migrations.

## Immediate Deployment

The pending `20260926130000_schedule_intern_list_ingestion.sql` was applied from a disposable, linked directory containing markers for the 47 versions already recorded remotely. Its dry run listed exactly that one pending migration; the tracked SQL and staged SQL were byte-identical. This did not repair or change the existing migration history. The migration reuses the H1B Cron credential from Vault, and both ingestion Edge Functions were deployed.

## Fresh Local Replay

`supabase start` was tested against the integration tree. It stopped at the first legacy Project 2 migration, `20260529_coderank_harness_profiles.sql`, because `public.cr_questions` is absent from a new local database. That older migration assumes a pre-existing website schema; this failure is not caused by the new Job Board migration. The local stack stopped itself after the error.

## Canonical Cleanup

1. Restore the 28 recorded remote migration files from Git history into the Project 2 integration tree without reapplying them.
2. Compare each differently timestamped local rewrite with the corresponding remote SQL and live schema. Archive redundant rewrites outside `supabase/migrations`; retain any genuine later behavior in a new, reviewed migration.
3. Add or document a baseline for the pre-existing website schema, then verify a fresh local Supabase reset and a `supabase db push --dry-run` with no unexpected migration.

The code integration can be merged into Project 2 `main` for the existing linked Supabase project because the needed live schema and new Cron migration are present. This does **not** make the migration tree suitable for fresh-project bootstrap or a routine `db push` from the repo. The KTP main website repository remains untouched.
