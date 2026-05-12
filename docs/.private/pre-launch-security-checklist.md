---
title: Pre-Launch Security Checklist — LenserFight 0.10.0
description: Final security review punch-list executed before the 2026-06-12 OSS announcement.
---

# Pre-Launch Security Checklist — Phase BQ

Every row must be **green** before tagging `v0.1.0-rc1`. Run from the
maintainer machine against staging, not local.

## 1. RLS coverage

- [ ] Every public-facing table has `ENABLE ROW LEVEL SECURITY` and at least
      one explicit policy for `anon`, `authenticated`, and `service_role`.
- [ ] `battles.battles`, `battles.templates`, `lensers.profiles` allow `anon`
      SELECT only on rows with the documented public lifecycle states
      (see `supabase/tests/58_anon_rls.sql`).
- [ ] No `anon` policy permits `INSERT / UPDATE / DELETE` on any table.
- [ ] Newly-added BJ–BP tables (`model_test_runs`, `media_quality_rules`,
      `media_quality_results`, `template_prompt_variables`) all enable RLS and
      restrict writes to row owners or service_role.

## 2. SECURITY DEFINER hygiene

- [ ] Every `SECURITY DEFINER` function declares a `SET search_path =`
      whitelist (no implicit search path).
- [ ] No `SECURITY DEFINER` function performs a write on behalf of `anon`
      without first asserting `auth.uid() IS NOT NULL`.
- [ ] `fn_browse_battles` reads only — confirmed not to expose `auth.email()`
      or other PII columns.

## 3. Exposed schema review

- [ ] `supabase/config.toml` `[api].schemas` lists exactly the schemas we
      intend to expose. Diff against the previous release.
- [ ] `battles`, `agents`, `lensers`, `public` are the only schemas reachable
      via PostgREST.

## 4. GRANT audit

- [ ] No `GRANT ... TO anon` on any write RPC.
- [ ] `fn_browse_battles`, `fn_battles_render_prompt`, `fn_get_*` read RPCs
      have `GRANT EXECUTE TO anon, authenticated, service_role`.
- [ ] Service-role-only functions (auto-finalize cron etc.) have **no**
      explicit `TO authenticated` grant.

## 5. BYOK key rotation path

- [ ] `lf gateway rotate-key` works end-to-end in the staging environment.
- [ ] Keys older than 90 days surface in `lf gateway keys list --json`.
- [ ] `byok-key-vault` migration drops are reversible (see migration notes).

## 6. CI guards

- [ ] `coverage-gate.yml` passes on the release branch.
- [ ] `migrations-guard.yml` passes — no migration was edited after merge.
- [ ] `seeds-guard.yml` confirms the deterministic UUID trio is unchanged.

## 7. Final smoke

- [ ] `pnpm smoke` exits 0 on a fresh clone.
- [ ] `scripts/e2e-battle.sh` exits 0 against a local Supabase reset.
- [ ] `lf battle browse --limit 1 --status open` returns 1 row without a
      session token.

## Sign-off

| Item | Status | Reviewer | Date |
|------|--------|----------|------|
| RLS coverage | ☐ | | |
| DEFINER hygiene | ☐ | | |
| Exposed schemas | ☐ | | |
| GRANT audit | ☐ | | |
| BYOK rotation | ☐ | | |
| CI guards | ☐ | | |
| Final smoke | ☐ | | |
| Tag `v0.1.0-rc1` | ☐ | | |
