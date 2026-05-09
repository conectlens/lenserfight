---
title: Pre-OSS Security Review
description: Security review findings and release decisions for the LenserFight Trust Gateway.
---

# Pre-OSS Security Review

This review covers the Trust Gateway release candidate across Supabase RLS, grants, `SECURITY DEFINER` boundaries, daemon secret handling, and transport authorization.

The operational release gate (migration floor, CI vs local DB tests, preview loops, changelog) lives in [Trust Gateway Release Readiness](./release-readiness.md). Verdicts on those two pages match: **conditionally ready** after automated gates and `supabase db test` pass.

## Verdict

**Release status:** conditionally ready after CI and migration tests pass.

No critical or high findings remain open in the release candidate. Medium findings are documented as preview behavior and do not elevate trust, expose secrets, or mint XP.

## Findings

| Severity | Finding | Status | Resolution |
|----------|---------|--------|------------|
| Critical | `audit.fn_chain_verify` could be called for arbitrary `p_lenser_id`. | Resolved | `20270513000001_pre_oss_gateway_security_hardening.sql` adds owner-or-service-role authorization. |
| Critical | Daemon scaffold refused all starts because identity probe was hard-coded false. | Resolved | `apps/gateway/src/probes.ts` provides real keychain, identity, session, and policy probes. |
| High | `lf-gateway-init` pointed users to missing `lf gateway register-device`. | Resolved | Bootstrap output now points to `lf gateway identity export-public` until registration is promoted. |
| High | Signed attestation trust could be bypassed by legacy CLI metadata path. | Resolved | `lf battle submit --attestation` now requires signed envelope arguments and calls `fn_record_signed_attestation`. |
| Medium | `lf gateway sync pull/push` and `lf gateway policy test` are preview stubs. | Accepted preview | CLI reference marks them preview; they cannot elevate trust or mutate policy state. |
| Medium | XP/audit safe wrappers swallow side-effect errors. | Accepted with operator check | Release readiness requires inspecting notices and running `08_gateway_xp_audit.sql`. |

## RLS and Grants

- Gateway tables remain RLS-first.
- Device, runner, sync, attestation, trust, and audit mutations go through `SECURITY DEFINER` functions.
- Direct client writes are not granted for `execution.attestation_verifications` or `audit.hash_chains`.
- `xp.apply` remains service-role-only and is invoked through definer wrappers/triggers.

## Search Path Review

All release-critical gateway definer functions are checked by `supabase/tests/07_gateway_security.sql` for explicit `search_path` configuration. Any new gateway definer added after the release candidate must be added to that test.

## Secret Handling

- The daemon refuses `SUPABASE_SERVICE_ROLE_KEY`.
- Ed25519 private keys stay in `@lenserfight/utils/keychain`.
- File-backed keychain fallback is allowed only for CI and explicit local development with `LF_GATEWAY_KEY_FILE_FALLBACK=1`.
- Project config and profile files are non-secret or user-level credential stores; device private keys are not written there.

## Transport Authorization

Loopback and Tailscale are transport choices only. The Trust Gateway does not treat network location as identity.

- `--bind 0.0.0.0` is forbidden.
- `--tailscale` requires consent pinned to a live CGNAT interface fingerprint.
- Signed envelopes and Supabase ownership checks remain required for trust-elevating server mutations.
- The HTTP `/peers` discovery response is only populated on the **primary** bind (`config.bind`). Extra binds (for example Tailscale) return an empty peer list so mesh-reachable listeners do not expose discovery payloads.

## Release Requirements

Before publishing:

```bash
pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain
pnpm nx build cli
pnpm nx run gateway:build
pnpm nx run gateway:build-init
supabase db test --db-url $LOCAL_DB_URL
```

The release is a no-go if any of these fail or if Postgres logs contain repeated `xp.apply failed` or `gateway hash chain append failed` notices during staging validation.
