-- 001 · Harden the Data API BEFORE any table exists.
--
-- Supabase's default privileges grant ALL on new objects in `public` to the
-- anon and authenticated roles. The reference project shipped to production
-- that way: every one of its 56 tables was readable with only the publishable
-- key, including password hashes and live session tokens.
--
-- This migration revokes those defaults and makes deny-by-default the baseline.
-- Later migrations grant SELECT back, table by table, only on public catalogue
-- data whose RLS policy also filters to published rows.

-- Existing objects (none expected on a fresh project, but be certain).
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Future objects created by any role that runs migrations.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- The schema itself stays visible so granted objects resolve; nothing is
-- readable without an explicit grant plus an RLS policy.
grant usage on schema public to anon, authenticated;
