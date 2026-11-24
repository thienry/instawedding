# Security rollout

Follow the order: the code needs step 2, and step 5 breaks the old code.

1. **Check Vercel variables** (Production and Preview): `ADMIN_JWT_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`), `ADMIN_EMAILS`. Without them, admin login or uploads stop working.
2. **Run** `supabase/migrations/20261123000000_rate_limits.sql` in the SQL Editor. It only adds objects.
3. **Deploy** the code.
4. **Test on the deployment:** admin login by email code, list and hide a photo, create a challenge, add and remove a ceremonialist; as a Google guest, post, like and delete a photo.
5. **Back up** the `posts` table, then **run** `supabase/migrations/20261123000100_lock_down_rls.sql`.
6. **Repeat step 4** and confirm the projector receives a new photo live.

Confirm the result:

```sql
select tablename, policyname, cmd, roles
from pg_policies where schemaname = 'public' order by 1, 2;
```

Expected: 3 policies on `posts`, 1 on `challenges`, 3 on `likes`, none on `ceremonialists`.

## Rollback

If step 6 fails, rerunning the baseline migration restores the open policies. This is the only case in which it may be rerun. Rerun step 5 once fixed.

## Known effects

- Posts created without a Google session can only be deleted by an admin.
- `likes_count` is recounted from `likes` on the next like, so a count that had drifted may change.
- Pages left open during the rollout must be reloaded.
