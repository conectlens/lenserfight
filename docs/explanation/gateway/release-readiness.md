---
title: Trust Gateway Release Readiness
description: Pre-OSS release gate, blockers, acceptance criteria, rollback notes, and go/no-go checklist for the LenserFight Trust Gateway.
---

# Trust Gateway Release Readiness

This page is the pre-OSS release gate for the LenserFight Trust Gateway (LTG). It tracks what is enforced in code, what remains conditional before publishing, and which checks must pass.

For security findings and RLS/definer posture, see [Pre-OSS Security Review](./security-review.md). That page and this one are aligned: **no critical or high security findings remain open**; shipping is **conditional** on CI, local Supabase DB tests, and explicit preview boundaries.

## Current Verdict

**Status:** conditionally ready — same bar as [Pre-OSS Security Review](./security-review.md): merge and tag only after the gates below pass. Medium risks may ship when marked preview and documented here.

| Area | Status | Gate |
|------|--------|------|
| Schema and migrations | Gate | Gateway migrations apply in order on a clean database; migration floor through `20270513000000_pre_oss_gateway_security_hardening.sql`. |
| Runtime daemon | Gate + preview | `lf-gatewayd` starts after preconditions pass; heartbeat/outbox/pull loops are **scheduled no-ops** in the OSS preview until device/signing boot context lands (see [apps/gateway/src/main.ts](../../../apps/gateway/src/main.ts)). |
| Attestation trust | Gate | Server-side signature verification covered by SQL tests; CLI uses signed envelope path for `--attestation`. |
| XP and audit | Gate + operator | XP mint rules and audit chain checks covered by `08_gateway_xp_audit.sql`; operators inspect Postgres notices per security review. |
| Docs | Gate | Gateway hub, rollout, security review, OSS cutover, CLI reference, and RFC-0003 are wired in the docs site. |
| CI | Gate | CI builds CLI + daemon + init, runs Vitest for gateway stack, static SQL artifact checks; full `supabase db test` is a **maintainer pre-tag** step (see below). |
| Release metadata | Gate | Changelog (Unreleased / RC), migration floor, artifact policy, rollback procedure explicit. |

## Historical blockers (resolved)

These were release blockers during earlier phases; they are **closed** in the current tree.

| Was | Resolution |
|-----|------------|
| Stubbed daemon preconditions | Real probes in [`apps/gateway/src/probes.ts`](../../../apps/gateway/src/probes.ts) for keychain, identity, session, kill switch, owner pause env. |
| `audit.fn_chain_verify` caller authorization | [`supabase/migrations/20270513000000_pre_oss_gateway_security_hardening.sql`](../../../supabase/migrations/20270513000000_pre_oss_gateway_security_hardening.sql) — owner-or-service-role. |
| `lf-gateway-init` / missing `register-device` | Bootstrap points to `lf gateway identity export-public` (see [`apps/gateway/src/init.ts`](../../../apps/gateway/src/init.ts), CLI). |
| Gateway docs not in VitePress nav | Sidebar and nav in [`apps/docs/.vitepress/config.ts`](../../../apps/docs/.vitepress/config.ts). |
| Missing negative-path SQL tests | [`supabase/tests/07_gateway_security.sql`](../../../supabase/tests/07_gateway_security.sql), [`08_gateway_xp_audit.sql`](../../../supabase/tests/08_gateway_xp_audit.sql). |

## Remaining register (preview / follow-up)

| Severity | Item | Owner | Notes |
|----------|------|-------|-------|
| Medium | `lf gateway sync pull`, `push`, `policy test` are preview stubs. | CLI + [`docs/reference/cli/gateway.md`](../../reference/cli/gateway.md) | Documented preview; cannot elevate trust. |
| Medium | CI does not run `supabase db test` (no disposable DB in default GitHub Actions). | [`.github/workflows/cli-smoke.yml`](../../../.github/workflows/cli-smoke.yml) | Static checks assert migration + test files; maintainers run `supabase db test` before tag. |
| Low | Daemon clock skew probe is offline-safe (always passes at startup). | [`apps/gateway/src/probes.ts`](../../../apps/gateway/src/probes.ts) | Online skew: `lf gateway doctor --check clock` when wired. |

## Migration Floor

An OSS release that includes LTG requires all migrations through:

```text
supabase/migrations/20270513000000_pre_oss_gateway_security_hardening.sql
```

Follow-up hardening migrations after that file are part of the release gate and must be included in the same release candidate.

## Artifact Policy

The pre-OSS Trust Gateway release is **source-first**:

- `lf-gatewayd` and `lf-gateway-init` are built from the monorepo with `pnpm nx run gateway:build` and `pnpm nx run gateway:build-init`.
- The release candidate does not promise standalone daemon binaries or a separate npm package for the daemon.
- The CLI remains the public operator surface for OSS users.
- Any future binary distribution must include its own signing, checksum, and upgrade policy before being advertised.

## Privilege Matrix

| Surface | Direct Table Access | RPC / Function Access | Notes |
|---------|---------------------|-----------------------|-------|
| `devices.registered_devices` | RLS owner read only | Mutations through `fn_device_*` | Trust transitions are audited and XP-triggered. |
| `devices.sync_outbox`, `sync_watermarks`, `nonce_cache` | No direct write path for clients | Sync via `fn_sync_push`, `fn_sync_pull`, `fn_sync_status` | Nonce replay is rejected server-side. |
| `execution.attestations` | Owner read only | Legacy write exists; release code must use signed attestation path | Trust computation ignores legacy client booleans for high tiers. |
| `execution.attestation_verifications` | Owner read only; no client writes | Inserted by `fn_record_signed_attestation` | Verification failure is persisted, not silently ignored. |
| `execution.trust_evaluations` | Owner read only after Phase A hardening | Read via `fn_get_submission_trust`; compute via definer | Non-owner reads are redacted by function. |
| `audit.hash_chains` | No client writes | `fn_chain_verify` requires owner or `service_role` | Gateway chain entries are append-only. |
| `xp.apply` | Not exposed | Called only from definer triggers/wrappers | XP failures do not roll back trust writes. |

## Go / No-Go Criteria

### Go

- All **security** critical/high items remain resolved (see [security review](./security-review.md)).
- Preview items above are accepted or explicitly deferred with docs/CLI labeling.
- Gateway migrations apply cleanly on a fresh local database.
- Negative-path SQL tests pass: `supabase db test --db-url $LOCAL_DB_URL` including `07_gateway_security.sql` and `08_gateway_xp_audit.sql`.
- `pnpm nx run gateway:build`, `pnpm nx run gateway:build-init`, and `pnpm nx build cli` pass.
- `lf gateway doctor --check daemon,transport --json` is parseable and passes in CI.
- Docs navigation exposes LTG architecture, security rules, roadmap, release readiness, rollout/rollback, CLI reference, and RFC-0003.
- Changelog and release notes state the migration floor and artifact policy.

### No-Go

- A client-controlled boolean can elevate a submission to `execution_verified` or `fully_trusted`.
- A non-owner can inspect another Lenser's gateway hash-chain integrity metadata.
- The daemon can run with `SUPABASE_SERVICE_ROLE_KEY` present.
- `--tailscale` can bind without explicit consent matching the live interface fingerprint.
- XP can mint `VERIFIED_LOCAL_EXECUTION_COMPLETED` before server-side signature verification.

## Phase 2 Entry Checklist

- Confirm the migration list starts at `20270511200000_devices_schema.sql` and includes every gateway migration through the audit-chain hardening follow-up.
- Run the migration batch on a disposable database before any shared staging environment.
- Prepare rollback notes for additive schema changes and compensating-action notes for XP/audit side effects.
- Run SQL tests with a service-role-capable local test connection.

## Residual Risk Policy

Medium risks may ship only when all of these are true:

- The behavior is clearly marked preview in docs and CLI output.
- It cannot silently elevate trust, mint XP, expose secrets, or bypass RLS.
- There is a direct follow-up issue or TODO in the release gate register.

## Operator Visibility

The XP and audit-chain triggers intentionally avoid rolling back trust-state writes when their side effects fail. This protects availability, but it means operators must inspect database notices/logs during staging and release validation.

Required release checks:

- Run `supabase db test --db-url $LOCAL_DB_URL` and confirm `07_gateway_security.sql` and `08_gateway_xp_audit.sql` pass.
- Inspect Postgres logs for `xp.apply failed` and `gateway hash chain append failed` notices after gateway test runs.
- Run `SELECT * FROM audit.fn_chain_verify(<lenser_id>, 'gateway');` for a seeded Lenser in staging and confirm `ok = true`.
- Treat repeated XP/audit notices as release blockers even when user-facing writes succeed.
