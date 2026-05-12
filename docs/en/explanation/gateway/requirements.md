---
title: Requirements
description: Sector-standard requirements checklist for device registration, lenser heartbeats, attestation, sync, transports, config, secrets, doctor, audit, policy, kill-switch, replay, workflow trust, and anti-cheat.
---

# Requirements

This is the sector-standard requirements checklist that the LTG implements. Every requirement has an **ID** and a one-line **acceptance test**. Requirements are referenced from the [RFC](../../rfcs/RFC-0003-trust-gateway.md), the [security rules](security-rules.md), and the [roadmap](roadmap.md).

## DR — Device Registration

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| DR-1 | A device row MUST be created via a `SECURITY DEFINER` RPC; direct INSERT is denied. | `INSERT INTO devices.registered_devices ...` from `authenticated` is rejected. |
| DR-2 | A new device starts in `trust_level='pending'`. | Newly registered device has `pending`. |
| DR-3 | A device row MUST have a non-null `lenser_id` matching the calling Lenser. | Cross-Lenser registration is rejected. |
| DR-4 | A device's `name` is unique per Lenser. | Duplicate name returns `device_name_taken`. |
| DR-5 | A device's `public_key` is set during the two-step approve flow. | `pending` rows MAY have NULL public key; `approved`+ rows MUST have non-null public key. |

## DA — Device Approval (two-step)

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| DA-1 | The pending device MUST post a signed challenge before the owner can approve. | Approving a device with no challenge returns `awaiting_device_challenge`. |
| DA-2 | The challenge envelope MUST verify against the device's submitted `public_key`. | Forged signature returns `signature_mismatch`. |
| DA-3 | Only the owning Lenser may approve. | Cross-Lenser approve returns `not_owner`. |
| DA-4 | Approval flips `trust_level: pending → approved` and persists the public key. | Verified by `lf gateway devices`. |
| DA-5 | An approval older than 24 h without a heartbeat is allowed but the device shows `gateway_status='disconnected'`. | Cron reconciliation. |

## DH — Device Heartbeats

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| DH-1 | Heartbeats MUST be signed envelopes. | Unsigned heartbeats are rejected. |
| DH-2 | Heartbeats update `last_heartbeat_at` and `daemon_version`. | Verified after `fn_device_heartbeat`. |
| DH-3 | Missing heartbeats >24 h transition the device to `offline`. | Cron sets `trust_level='offline'` (advisory). |
| DH-4 | Repeated signature failures within 1 h transition the device to `unhealthy`. | Cron sets `trust_level='unhealthy'`. |
| DH-5 | Heartbeats MUST be idempotent (replays of in-window envelopes are rejected). | `nonce_cache` rejects replay. |

## RH — Lenser Heartbeats

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| RH-1 | A lenser MUST be bound to exactly one device via `execution.runner_device_bindings(status='active')`. | Verified by `fn_runner_list_with_devices`. |
| RH-2 | A lenser heartbeat is reported as part of the device heartbeat envelope (`body.runners[]`). | Verified at write time. |
| RH-3 | A lenser whose bound device is `revoked/blocked/unhealthy` MUST refuse new executions. | Daemon refuses; server RPC also refuses. |
| RH-4 | A lenser-bound execution that lacks a corresponding heartbeat in the last 5 minutes degrades trust. | `agent_verified` ceiling for that submission. |

## EA — Execution Attestations

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| EA-1 | An attestation MUST reference an existing `execution.runs.id` owned by the calling Lenser. | Cross-owner reference rejected. |
| EA-2 | An attestation MUST be signed by the device's Ed25519 key. | Forged signature rejected. |
| EA-3 | The server SHALL set `signed`, `gateway_verified`, `device_trusted`, `policy_passed` after server-side derivation. | Client-supplied values are ignored. |
| EA-4 | The attestation row is append-only. | UPDATE/DELETE blocked by `public.fn_deny_mutation` triggers. |
| EA-5 | A submission's trust level is recomputed on attestation insert and surfaced via `fn_get_submission_trust`. | Verified end-to-end. |

## SC — Sync Conflict Handling

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| SC-1 | Each conflict-aware object class declares a merge function. | Per-class entry in `libs/infra/gateway/src/lib/object-classes.ts`. |
| SC-2 | Merge MUST be deterministic given the same inputs. | Property test in `libs/infra/gateway`. |
| SC-3 | Auto-merge that cannot resolve creates a conflict row visible to `lf gateway sync status --conflicts`. | UI surfaces. |
| SC-4 | A conflict resolution write goes through `fn_sync_resolve_conflict` and is audit-logged. | Audit chain entry. |
| SC-5 | Local-only classes MUST NEVER appear in the outbox. | Daemon rejects `local_only_class`. |

## SB — Sync Bidirectional Cloud

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| SB-1 | Pull MUST advance per-(device, class) watermark atomically with the row return. | Replay returns the same set. |
| SB-2 | Push MUST verify envelope before applying any entry. | Forged envelope returns `signature_mismatch`. |
| SB-3 | Push and pull are scoped to the calling Lenser by RLS-backed DEFINER RPCs. | Cross-Lenser reads/writes rejected. |
| SB-4 | Cloud-authoritative classes are read-only on edges. | Edge push attempt rejected with `cloud_authoritative`. |

## TS — Tailscale / Private-Network Transport

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| TS-1 | The daemon MUST NOT bind a Tailscale interface unless `--tailscale` is supplied. | Default boot binds `127.0.0.1` only. |
| TS-2 | Tailscale presence MUST be ignored for authentication. | A request from a Tailscale peer without a valid signed envelope is rejected. |
| TS-3 | The daemon detects Tailscale interfaces by CIDR (`100.64.0.0/10`) and matching interface flags. | Detector unit-tested. |
| TS-4 | `lf gateway doctor --check transport` reports the active bind set. | Visible in CI smoke output. |

## LH — Localhost Exposure Rules

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| LH-1 | The daemon binds `127.0.0.1` only by default. | Boot logs the bind list. |
| LH-2 | Adding `0.0.0.0` is forbidden in v1. | Daemon refuses with `public_bind_forbidden`. |
| LH-3 | Daemon's bind port is configurable via `--port` and defaults to `38080`. | Port collision logs and exits non-zero. |
| LH-4 | mDNS advertisement is opt-in. | Off by default. |

## CO — Config Ownership

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| CO-1 | `.lenserfight.json` MUST NOT contain secrets. | `saveConfig` strips secrets; doctor warns if any leak. |
| CO-2 | `~/.lenserfight/config.json` MUST hold tokens only, never signing keys. | Schema-tested. |
| CO-3 | `~/.lenserfight/gateway/` is daemon-private state, mode `0700` (dir) and `0600` (files). | Filesystem check. |
| CO-4 | OS keychain holds signing keys; access mediated by `libs/utils/keychain`. | Verified at boot. |
| CO-5 | Environment variables hold bootstrap secrets only. | Doctor confirms. |

## SH — Secret Handling

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| SH-1 | Private keys NEVER leave the OS keychain (except export-public for public key). | Audit. |
| SH-2 | BYOK keys NEVER appear in DB or `.lenserfight.json`. | Existing rule in `byok-key-resolver`. |
| SH-3 | Daemon redacts envelopes from logs (truncate to 8 base64 chars). | Log inspection in tests. |
| SH-4 | `service_role` SHALL NOT appear in daemon or CLI runtime config. | Daemon refuses to start with `service_role_in_daemon`. |

## DG — Doctor Diagnostics

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| DG-1 | `lf gateway doctor` returns non-zero on any failed check. | CI smoke. |
| DG-2 | Each check has an explicit machine-parseable code. | JSON output mode. |
| DG-3 | Doctor MUST not require the daemon to be running for `clock`, `keychain`, `identity` checks. | Verified. |
| DG-4 | Doctor MUST run `daemon` and `sync` checks against the daemon when present. | Verified. |
| DG-5 | Doctor SHOULD finish in < 5 s on a healthy machine. | Soft target. |

## AU — Auditability

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| AU-1 | Every device trust transition appends to `audit.hash_chains` with `chain_kind='gateway'`. | Trigger-tested. |
| AU-2 | Every signed RPC writes a chain entry on success. | Verified. |
| AU-3 | Audit entries are append-only. | UPDATE/DELETE blocked. |
| AU-4 | Audit chain is verifiable via `audit.fn_chain_verify(p_lenser_id UUID, p_kind TEXT)`. | Returns OK / first-bad-index. |

## PE — Policy Enforcement

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| PE-1 | `agents.fn_evaluate_pre_run_policy` is called before any sensitive run. | Server side. |
| PE-2 | Daemon caches policy verdicts ≤ 60 s. | Verified. |
| PE-3 | Policy verdict `deny` short-circuits the run; no attestation is recorded. | Verified. |

## KS — Kill-Switch Integration

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| KS-1 | `global_kill_switch=true` blocks daemon startup. | Verified. |
| KS-2 | `runner_paused=true` blocks new attestations for the workspace. | Verified. |
| KS-3 | Kill switch state is polled every 10 s by the daemon. | Verified. |
| KS-4 | Kill switch transitions are audit-logged. | Verified. |

## RP — Replay Protection

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| RP-1 | Envelope `iat` MUST be within ±300 s of server clock. | Out-of-window rejected. |
| RP-2 | Envelope `nonce` MUST be unique within 600 s. | Replay rejected. |
| RP-3 | Nonce cache is cleaned periodically. | Cron. |

## WT — Workflow Trust

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| WT-1 | An attestation reaches `fully_trusted` only with non-null `workflow_hash` AND `lens_hash`. | Verified. |
| WT-2 | Workflow definitions referenced by an in-flight attestation MUST be pinned to a `lenses.versions.id`. | Pin enforced. |
| WT-3 | Tool invocations contribute to `policy_passed` evaluation. | Verified. |

## AC — Anti-Cheat Execution Validation

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| AC-1 | Clients MAY NOT set `gateway_verified = true`. | RPC ignores client value. |
| AC-2 | Clients MAY NOT set `device_trusted = true`. | RPC ignores client value. |
| AC-3 | Clients MAY NOT set `policy_passed = true`. | RPC ignores client value. |
| AC-4 | XP-minting paths require server-derived `gateway_verified=true`. | Trigger condition. |
| AC-5 | Reputation pipelines consume server-derived trust levels only. | Verified. |

## NR — Naming Reconciliation

| ID | Requirement | Acceptance test |
|----|-------------|-----------------|
| NR-1 | The canonical workspace pause column name is **`runner_paused`**. Code that uses `agent_paused` MUST be renamed (or aliased with a deprecation comment) in Phase A. | Single column name across docs and code. |
| NR-2 | The CLI flag and docs use **lenser**, never **agent**, for execution-pause concepts. | Doc + code grep returns no `agent_paused` matches by end of Phase A. |
| NR-3 | Where the legacy term must be retained (DB column already named `agent_paused`), the migration creates a generated column or view alias to expose the new name without breaking callers. | Migration test. |
