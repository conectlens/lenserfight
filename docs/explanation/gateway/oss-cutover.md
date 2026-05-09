---
title: OSS Cutover Checklist
description: Final release candidate checklist and go/no-go decision for publishing the LenserFight Trust Gateway.
---

# OSS Cutover Checklist

This checklist is the final gate before publishing the Trust Gateway release candidate.

## Release Candidate

| Item | Value |
|------|-------|
| Release track | Trust Gateway pre-OSS release candidate |
| Migration floor | `20270513000000_pre_oss_gateway_security_hardening.sql` |
| Artifact policy | Source-first; no standalone daemon binaries promised |
| Public CLI surface | `lf gateway *` |
| Runtime binary | `lf-gatewayd` from `apps/gateway/src/main.ts` |
| Init binary | `lf-gateway-init` from `apps/gateway/src/init.ts` |

## Required Checks

Run before creating the release candidate tag:

```bash
pnpm install --frozen-lockfile
pnpm nx run-many -t test -p gateway,infra-gateway,util-signing,util-keychain
pnpm nx build cli
pnpm nx run gateway:build
pnpm nx run gateway:build-init
pnpm nx run web:build
supabase db test --db-url $LOCAL_DB_URL
```

Run the offline-safe doctor gate:

```bash
SUPABASE_SERVICE_ROLE_KEY="" \
SUPABASE_URL="${SUPABASE_URL:-https://example.supabase.co}" \
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-ci-anon-key-placeholder}" \
LF_GATEWAY_KEY_FILE_FALLBACK=1 \
node dist/apps/cli/main.js gateway doctor --check daemon,transport --json
```

## Go / No-Go

| Decision | Condition |
|----------|-----------|
| Go | All required checks pass, gateway SQL tests pass, docs build, and no critical/high findings remain open. |
| No-go | Any trust-elevation, RLS, service-role runtime, Tailscale consent, XP, or audit-chain gate fails. |
| Deferred | Non-security preview behavior remains, but it is documented and cannot mutate trust or policy state. |

## Release Candidate Tag

Use the repository's existing release process. Suggested tag/message wording:

```text
Trust Gateway pre-OSS release candidate
```

Do not publish separate daemon binaries from this release candidate. If a GitHub Release is created, attach only source/release notes unless a future binary signing policy is approved.

## Rollback Link

Use [Rollout and Rollback](./rollout-rollback.md) for emergency disablement and compensating-action rollback.

## Final Decision

**Current state:** ready for release-candidate validation, not automatic production publish.

The release may proceed to OSS review once CI and local/staging database tests complete successfully.
