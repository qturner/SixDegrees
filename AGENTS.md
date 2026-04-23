# Six Degrees Backend

## Production migrations

- Treat `shared/schema.ts` as the source of truth for app code, but do not assume `npm run db:push` is safe for production.
- Before any production schema change, inspect what `drizzle-kit push` wants to do. If it tries to reconcile unrelated drift, do not run it against production.
- For additive production changes, always create a checked-in SQL migration under `migrations/` and prefer applying that targeted SQL only.
- The standard targeted apply flow in this repo is:
  1. `cd /Users/teebs/Projects/six-degrees-backend`
  2. `set -a && source .env.local`
  3. Run the specific migration file against `DATABASE_URL` with the repo's `pg` client, not `drizzle-kit push`.
- After applying a production migration, verify the expected columns/indexes via `information_schema` before considering it complete.

## Deployment reminder

- A production database migration does not make a new API route live by itself. Commit and push the backend repo so Vercel can deploy the code change.
- For new authenticated routes, a fast production sanity check is to hit the route without auth and confirm `401 Unauthorized` instead of `404 Not Found`.
