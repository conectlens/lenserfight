---
title: Rollout and Rollback Runbook
description: Operator runbook for rolling out or disabling the LenserFight Trust Gateway before OSS publication.
---

# Rollout and Rollback Runbook

This runbook covers the OSS release candidate of the LenserFight Trust Gateway (LTG). It assumes the CLI, daemon, and Supabase migrations are deployed together.

## Rollout Order

1. Apply migrations through `20270513000001_pre_oss_gateway_security_hardening.sql` on a disposable database.
2. Run `supabase db test --db-url $LOCAL_DB_URL` and confirm gateway tests `07_gateway_security.sql` and `08_gateway_xp_audit.sql` pass.
3. Build the binaries:

```bash
pnpm nx build cli
pnpm nx run gateway:build
pnpm nx run gateway:build-init
```

4. Initialize one local device:

```bash
LF_GATEWAY_KEY_FILE_FALLBACK=1 node dist/apps/gateway/init.js
node dist/apps/cli/main.js gateway identity show
```

5. Run offline-safe doctor checks:

```bash
node dist/apps/cli/main.js gateway doctor --check daemon,transport --json
```

6. Enable Tailscale only after explicit consent:

```bash
lf gateway consent show
lf gateway consent grant tailscale
lf gateway serve --tailscale
```

## Rollback Strategy

Most gateway schema changes are additive, but XP and audit-chain side effects are append-only. Treat them as compensating-action rollbacks rather than destructive reversions.

| Area | Rollback Action | Notes |
|------|-----------------|-------|
| Daemon runtime | Stop `lf-gatewayd`; do not pass `--tailscale`; revoke consent with `lf gateway consent revoke`. | No database rollback required. |
| Device trust | Use `devices.fn_device_revoke` through CLI/RPC. | Revocation is audited and should not be deleted. |
| Sync engine | Stop daemon loops and stop calling `fn_sync_push`/`fn_sync_pull`. | Outbox rows can remain for later reconciliation. |
| Attestation verification | Stop using `fn_record_signed_attestation`; trust remains capped unless verified rows exist. | Do not delete verification rows; they are incident evidence. |
| XP | Add compensating XP ledger events if a rule over-awarded. | Do not mutate existing XP ledger rows directly. |
| Audit chain | Leave existing `audit.hash_chains` rows intact. | Use `audit.fn_chain_verify` to document integrity state. |

## Emergency Disablement

Use this sequence for a suspected compromised device or bad gateway release:

1. Revoke the device trust in Supabase using the owner account.
2. Set workspace `global_kill_switch = true` or `runner_paused = true`.
3. Stop `lf-gatewayd` on all local machines.
4. Revoke Tailscale consent locally:

```bash
lf gateway consent revoke
```

5. Run:

```sql
SELECT * FROM audit.fn_chain_verify('<lenser-id>'::uuid, 'gateway');
```

6. Preserve logs containing `xp.apply failed` or `gateway hash chain append failed` notices.

## Release Validation Checklist

- `lf gateway doctor --check daemon,transport --json` passes in CI.
- The daemon refuses `SUPABASE_SERVICE_ROLE_KEY`.
- `--bind 0.0.0.0` is rejected.
- `--tailscale` refuses startup without matching consent.
- `audit.fn_chain_verify` refuses non-owner authenticated callers.
- `VERIFIED_LOCAL_EXECUTION_COMPLETED` XP only mints on `fully_trusted` transitions.
