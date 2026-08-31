# Supabase Security Remediation Checklist

Last verified: 2026-07-27 (America/New_York)

## Live database containment

- [x] Enabled Row-Level Security on all eight application tables.
- [x] Revoked all table privileges from `anon` and `authenticated`.
- [x] Revoked sequence privileges from `anon` and `authenticated`.
- [x] Revoked default table and sequence privileges for future migrations.
- [x] Preserved existing rows; the migration has no row deletion or schema-drop statements.

Protected tables: `app_users`, `cafe_drinks`, `cafes`, `drinks`, `favorites`, `place_search_cache`, `reviews`, and `user_drink_suggestions`.

Verification: `npm run db:verify-security`

Result: all eight tables reported `rls_enabled = true` and `has_client_privileges = false`.

## Public Data API

- [x] Verified the publishable key cannot select from any protected table.
- [x] All eight REST checks returned HTTP 401.

Verification: `npm run db:verify-data-api`

## Repeatable repository protection

- [x] Added RLS and explicit grant revocation to `server/db/schema.sql`.
- [x] Added secure default privileges for future tables and sequences.
- [x] Added database and Data API verification scripts.
- [x] Added npm commands for both verification scripts.

## Express API hardening

- [x] Added authentication to `POST /api/cafes/:cafeId/drinks`.
- [x] Added authentication to `POST /api/cafes/by-place/:placeId/drinks`.
- [x] Verified both endpoints return HTTP 401 without a bearer token.
- [x] Added rate limiting to password login and username availability checks.
- [x] Added unit coverage for allowed, blocked, and isolated rate-limit behavior.

## Local quality checks

- [x] `npm test` — 8 tests passed.
- [x] `npm run build` — production build succeeded.
- [x] `.env` is ignored by Git.
- [x] `.env` is not tracked and has no commit history in this repository.

## Nearby cafe restoration

- [x] Database cache reads no longer prevent Google Places searches.
- [x] Failed cafe persistence returns live Google results instead of discarding them.
- [x] Failed database cache writes are logged without failing the response.
- [x] A safe filter fallback returns reasonable Google cafes when the strict filter rejects everything.
- [x] The frontend distinguishes no results, location fallback, filter fallback, and cache unavailability.
- [x] Supabase bearer-token enforcement remains active for protected Express routes.
- [x] Regression test: Google succeeds and database succeeds.
- [x] Regression test: Google succeeds and database fails.
- [x] Regression test: strict filter rejects everything.
- [x] End-to-end outage test: 7 live cafes returned with PostgreSQL deliberately unreachable.
- [x] Public Supabase Data API denial reverified: all 8 tables returned HTTP 401.
- [x] RLS/grant state reverified: all 8 tables have RLS enabled and no client-role privileges.
- [x] Replaced the direct IPv6 `DATABASE_URL` with the exact Supabase Session pooler URL (`aws-1-us-east-1.pooler.supabase.com:5432`).
- [x] Verified Session pooler connectivity and rechecked RLS/client-role grants on 2026-07-27.

## Dashboard and credential follow-up

- [ ] Sign in to the Supabase dashboard and rerun Security Advisor.
- [ ] Confirm `rls_disabled_in_public` no longer appears.
- [ ] Review API/database logs for suspicious historical access.
- [x] Checked the repository and full Git history for deployment configuration, workflows, production URLs, branches, and tags; none were found.
- [x] User checked Vercel, Render, and Railway through GitHub sign-in and reported no manually created projects (2026-07-21); the automation browser could not independently inspect those signed-in sessions.
- [x] Identified environments holding `DATABASE_URL` or the legacy `SUPABASE_SERVICE_ROLE_KEY`: local `.env` only, based on repository evidence and the user’s provider-account check.
- [ ] Rotate the database password; update deployment secrets and local `.env`; verify connectivity.
- [ ] Revoke the now-unused service-role credential and remove it from local `.env`.
- [ ] Confirm the old credentials no longer work.

Do not rotate live credentials until replacement values can be updated in every deployed server in the same maintenance window. Never place a service-role or secret key in a `VITE_` variable.

## Public-repository review

- [x] Confirmed local secrets are ignored and are absent from all Git commits and branches.
- [x] Confirmed production dependencies have no known npm audit advisories.
- [x] Removed reviewer email addresses from API review payloads.
- [x] Required a valid Supabase bearer token for signup-profile changes; identity is derived from the verified token.
- [x] Removed the application's service-role-key dependency.
- [x] Replaced internal exception details in HTTP 500 responses with a generic message.
- [x] Disabled the Express signature, limited JSON bodies, and added baseline browser security headers.
- [x] Expanded ignore rules for environment variants, private keys, certificates, and common credential files.
