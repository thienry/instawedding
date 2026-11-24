# supabase/

- `migrations/` is the only source of the schema; the first file is the baseline
- New change = new `YYYYMMDDHHMMSS_description.sql` file. Do not edit existing migrations
- **Do not rerun the baseline on an existing database:** it recreates policies that may have been dropped later
- When replacing a policy, `DROP` the old one: permissive policies are combined with OR
- The author applies migrations manually in the SQL Editor. Never apply without approval
- Changed a `posts` column? Follow the recipe in the root `CLAUDE.md`
- `migrations.test.ts` runs every migration in an embedded Postgres and checks the policies: extend it with each change
