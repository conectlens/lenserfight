---
title: "RFC-0003: LenserFight Trust Gateway (LTG)"
description: Canonical RFC defining the LenserFight Trust Gateway — a signed, conflict-aware coordination layer across local devices, Tailscale-trusted devices, and LenserFight Cloud.
---

# RFC-0003: LenserFight Trust Gateway (LTG)

| | |
|---|---|
| **Status** | Draft |
| **Author** | LenserFight Core |
| **Phase** | Phase 36–42 (Trust Gateway A–G) |
| **Created** | 2026-05-09 |
| **Supersedes** | — |
| **Superseded by** | — |

## Summary

This RFC promotes the existing `lf gateway` command into a documented, layered platform — the **LenserFight Trust Gateway (LTG)** — that mediates secure execution and synchronization across:

- **local devices** owned by one Lenser account,
- **trusted devices** reachable over a private network (typically Tailscale / WireGuard),
- **LenserFight Cloud** (Supabase + Edge Functions + the platform-api).

The LTG preserves the current **provider/model routing** behavior of `lf gateway models` (see [`apps/cli/src/commands/gateway.ts`](../../apps/cli/src/commands/gateway.ts)) and the current **device + runner trust** RPCs introduced in:

- [`supabase/migrations/20270511200000_devices_schema.sql`](../../supabase/migrations/20270511200000_devices_schema.sql)
- [`supabase/migrations/20270511300000_runner_device_bindings.sql`](../../supabase/migrations/20270511300000_runner_device_bindings.sql)
- [`supabase/migrations/20270511400000_execution_attestations_and_trust.sql`](../../supabase/migrations/20270511400000_execution_attestations_and_trust.sql)
- [`supabase/migrations/20270511500000_xp_rules_device_runner_local_execution.sql`](../../supabase/migrations/20270511500000_xp_rules_device_runner_local_execution.sql)

It adds three new things on top, and nothing else:

1. **Per-device cryptographic identity** (Ed25519 keypair, OS-keychain-resident).
2. **A signed envelope protocol** for execution requests, attestations, and sync messages with replay protection.
3. **A long-running daemon** (`apps/gateway/`) that enforces those contracts on the developer's machine and coordinates with peer devices and the cloud.

## Motivation

Today the Gateway is a stateless CLI:

- Provider/model routing is a presentation-only concern in [`gateway.ts`](../../apps/cli/src/commands/gateway.ts) (`classifyRoute`).
- Device approval and runner binding are short bursts of REST calls against `devices.fn_device_*` and `execution.fn_runner_*`.
- Battle attestation booleans (`signed`, `gateway_verified`, `device_trusted`, `policy_passed`) are **self-reported by the client** in [`fn_compute_submission_trust`](../../supabase/migrations/20270511400000_execution_attestations_and_trust.sql).
- There is no enforced separation between "transport" and "identity"; private-network trust (Tailscale, mDNS) does not exist as a first-class concept.
- Sync between devices is implicit; the only durable client-side state is `~/.lenserfight/` and project-local `.lenserfight/` (see [`apps/cli/src/config/project-config.ts`](../../apps/cli/src/config/project-config.ts) and [`apps/cli/src/utils/automation-objects.ts`](../../apps/cli/src/utils/automation-objects.ts)).

The product needs the Gateway to grow into the **secure boundary** that enables:

- One human Lenser to own many AI agents, many trusted devices, many runners, and many battle participations.
- **Verified local execution** that materially raises battle trust and reputation.
- **Auditable** device trust and revocable local execution.
- A **conflict-aware**, **bidirectional** sync model that works offline-first on local machines and reconciles with cloud.

We solve this without breaking the current CLI, by layering crypto, signed envelopes, an outbox-based sync engine, and a daemon under the existing command namespace.

## Goals

- **G1** — Preserve every existing `lf gateway` subcommand and its observable behavior.
- **G2** — Establish per-device cryptographic identity (Ed25519) without storing private keys in the database, the project, or `~/.lenserfight/config.json`.
- **G3** — Introduce a signed envelope used uniformly for: execution attestations, sync push, sync pull, peer-to-peer messages, and any future signed RPC.
- **G4** — Enforce server-side trust evaluation: clients can never set `gateway_verified = true` directly.
- **G5** — Make sync deterministic via an outbox + watermarks model with explicit per-object-class authority and merge policy.
- **G6** — Allow opt-in private-network exposure via Tailscale (or any private interface), with Tailscale presence treated as a transport channel and never as an authentication assertion.
- **G7** — Mint XP for new platform/battle rules only after server-verified attestations.

## Non-goals

- **NG1** — End-to-end encryption between peers beyond TLS-on-loopback / WireGuard channel encryption. (Future RFC.)
- **NG2** — Cross-Lenser federation. The LTG is single-account by design in v1.
- **NG3** — Replacing Supabase Realtime with a custom mesh. We build on top.
- **NG4** — Public battles enablement. Still gated by [`docs/reference/platform-api/beta-roadmap.md`](../reference/platform-api/beta-roadmap.md).
- **NG5** — Migrating existing local battle storage encryption ([`apps/cli/src/utils/local-battle-storage.ts`](../../apps/cli/src/utils/local-battle-storage.ts)) — those AES-256-GCM envelopes remain authoritative for local-only material.

## Glossary

| Term | Definition |
|------|------------|
| **LTG** | LenserFight Trust Gateway. The named system this RFC defines. |
| **Lenser** | A human account in `lensers.profiles`. |
| **Device** | A row in `devices.registered_devices`. Has its own Ed25519 keypair once approved. |
| **Runner** | A row in `execution.runners` (TBD migration); bound to a device via `execution.runner_device_bindings`. |
| **Daemon** | The `apps/gateway/` long-running process. One instance per device. |
| **Envelope** | A signed JSON object with `v, alg, kid, iat, nonce, body, sig`. |
| **Attestation** | A `execution.attestations` row plus its corresponding signed envelope. |
| **Outbox** | `devices.sync_outbox` — append-only log of local changes pending cloud propagation. |
| **Watermark** | `devices.sync_watermarks` — per-(device, object_class) cursor into the cloud changefeed. |
| **Object class** | The category of a sync object (e.g. `agent`, `workflow`, `lens_draft`, `pref`). |

## Detailed design

### 1. Trust topology

```
┌───────────────────────┐
│ Human Lenser          │
└─────────┬─────────────┘
          │
   ┌──────┼──────┬──────────────────┐
   │             │                  │
┌──▼──┐     ┌────▼─────┐       ┌────▼────┐
│Agents│    │ Devices  │       │Runners  │
└──────┘    │(+pubkey) │       │(bind→D) │
            └────┬─────┘       └────┬────┘
                 │                  │
                 ▼                  ▼
         Daemon (apps/gateway)  Execution
                 │                  │
                 ▼                  ▼
         Sync Outbox/Pull       Attestation
                 │                  │
                 ▼                  ▼
                LenserFight Cloud (Supabase)
```

- One Lenser → many devices → many runners → many runs → many attestations → many submissions.
- The daemon is the only process trusted to sign on behalf of the device.
- Cloud is authoritative for verdicts (XP, trust evaluation, kill-switch state); the device is authoritative for drafts and BYOK material.

### 2. Identity

#### 2.1 Algorithm

- **Ed25519** (RFC 8032). 32-byte private key, 32-byte public key.
- Key generation occurs on the device, ideally inside the daemon's `init` command. The private key never leaves the device.

#### 2.2 Storage

- **Private key** lives in the OS keychain, accessed via [`libs/utils/keychain`](../../libs/utils/keychain). Backends:
  - macOS: Keychain Services
  - Linux: libsecret / Secret Service API
  - Windows: Credential Manager
- The `keytar` package is the canonical Node binding. The library wraps `keytar` lazily so web bundles never pull it in.
- A fallback file-based backend is provided **only** for ephemeral CI environments; it requires explicit `LF_GATEWAY_KEY_FILE_FALLBACK=1` and warns loudly.

#### 2.3 DB binding

`devices.registered_devices` gains:

| Column | Type | Notes |
|--------|------|-------|
| `public_key` | `TEXT` | base64 (raw 32 bytes) |
| `signing_algo` | `TEXT` | always `ed25519` in v1 |
| `last_heartbeat_at` | `TIMESTAMPTZ` | updated by signed `fn_device_heartbeat` |
| `daemon_version` | `TEXT` | reported by daemon |

`public_key` is set during device approval (two-step flow, §5).

### 3. Signed envelope

```ts
interface SignedEnvelope<T> {
  v: 1
  alg: 'ed25519'
  kid: string                  // device id
  iat: number                  // unix seconds at sign time
  nonce: string                // 128-bit random, base64url
  body: T
  sig: string                  // ed25519(SHA-256(JCS({v,alg,kid,iat,nonce,body})))
}
```

- **Canonicalization**: JCS (RFC 8785) over the unsigned object `{v, alg, kid, iat, nonce, body}`.
- **Hash**: SHA-256 of the canonicalization output.
- **Signature**: detached Ed25519 over the hash, encoded as base64url.
- **Replay window**: server rejects envelopes where `|now - iat| > 300s`.
- **Nonce uniqueness**: `devices.nonce_cache(nonce, device_id, expires_at)` rejects replay within 600s.
- **kid scope**: `kid` MUST equal a `devices.registered_devices.id` belonging to the JWT-authenticated Lenser.

The TypeScript implementation lives in [`libs/utils/signing`](../../libs/utils/signing); the Postgres verification lives in `extensions.fn_verify_attestation_signature` (using `pgsodium` if available, else a Deno Edge Function fallback at `supabase/functions/verify-attestation/`).

### 4. Three sync scopes

| Scope | Transport | Authn | Authz | Conflict policy |
|-------|-----------|-------|-------|-----------------|
| **A. Local mesh** | `127.0.0.1` HTTP/WS, mDNS discovery | Ed25519 + JWT | Same-Lenser, `trust_level ∈ {approved, trusted}` | Leader (oldest trusted device) wins for write coordination |
| **B. Tailscale / private network** | WireGuard via Tailscale (`100.64.0.0/10`) | Ed25519 + JWT (Tailscale ID is **ignored** for authn) | Same-Lenser, explicit `--tailscale` daemon flag | Same as Local |
| **C. Cloud** | Supabase REST / RPC / Realtime | Supabase JWT + per-RPC signed envelope when mutating trust state | RLS deny-by-default, `SECURITY DEFINER` RPCs | Per-class merge policy, default LWW + vector clock |

### 5. Two-step device approval

Replaces the current single-RPC `fn_device_approve` with a **challenge/response** that anchors the device's public key.

```
┌──────────────┐                    ┌──────────────┐                ┌──────────┐
│   Daemon     │                    │     Cloud    │                │  Owner   │
│ (new device) │                    │  (Supabase)  │                │   CLI    │
└──────┬───────┘                    └──────┬───────┘                └────┬─────┘
       │                                   │                              │
       │ fn_device_register_with_key       │                              │
       │ (name, type, public_key,          │                              │
       │  capabilities)                    │                              │
       ├──────────────────────────────────►│                              │
       │  ◄ device_id, challenge_nonce ◄───┤                              │
       │                                   │                              │
       │ fn_device_post_challenge          │                              │
       │ (envelope signed with             │                              │
       │  body={device_id, challenge})     │                              │
       ├──────────────────────────────────►│                              │
       │                                   │                              │
       │                                   │ owner reviews `lf gateway    │
       │                                   │ devices --pending`           │
       │                                   │ ◄────────────────────────────┤
       │                                   │ fn_device_approve(device_id) │
       │                                   ├─────────────────────────────►│
       │                                   │                              │
       │                                   │ trust_level: pending → approved
       │                                   │ public_key stored
```

Failure modes:

- Signature does not verify: device stays `pending`, returns `signature_mismatch`.
- Owner approves but no challenge has been answered: returns `awaiting_device_challenge`.
- Owner approves a device whose `lenser_id` differs from caller's profile: rejected by RLS-backed RPC (existing pattern).

### 6. Attestation hardening

`execution.attestations` and `execution.trust_evaluations` keep their schema but the trust path is rebuilt:

- `fn_record_execution_attestation` requires a signed envelope; the server (re)derives:
  - `device_trusted` — from `devices.registered_devices.trust_level` of the `device_id` at insert time.
  - `gateway_verified` — only set TRUE if `fn_verify_attestation_signature` succeeds.
  - `policy_passed` — only set TRUE if `agents.fn_evaluate_pre_run_policy` (Phase 8) for the corresponding run returned `allow`.
  - `signed` — derived from envelope verification, not from `p_signed`.
- `fn_compute_submission_trust` IGNORES caller-supplied flags and reads from `execution.attestations` columns the server itself wrote.
- The trust ladder thresholds (`unverified` → `account_verified` → `agent_verified` → `device_verified` → `runner_verified` → `execution_verified` → `fully_trusted`) keep their meaning, but `execution_verified` and `fully_trusted` now require a signature-verified attestation **and** a server-evaluated policy verdict.

### 7. Sync engine

#### 7.1 Tables

| Table | Purpose |
|-------|---------|
| `devices.sync_outbox` | Append-only log of pending local→cloud changes per device |
| `devices.sync_watermarks` | Per-(device, object_class) cursor into the cloud changefeed for pull |
| `devices.nonce_cache` | Replay protection (10-minute retention) |

#### 7.2 RPCs

- `devices.fn_sync_push(p_envelope JSONB)` — verifies envelope, walks `body.entries[]`, applies each per its object class.
- `devices.fn_sync_pull(p_object_classes TEXT[], p_limit INT)` — returns rows newer than the device's watermark for each requested class, advances watermarks atomically.

#### 7.3 Object classes

| Authority | Class | Examples |
|-----------|-------|----------|
| **Cloud-only** | `xp_total`, `trust_evaluation`, `battle_result`, `policy`, `budget`, `kill_switch`, `dark_launch`, `ai_catalog` | Server-verified verdicts |
| **Local-only (never sync raw)** | `byok_key`, `local_battle`, `scratchpad_draft`, `keychain_entry` | Material that must never leave the device |
| **Conflict-aware (bidirectional)** | `agent_config`, `agent_team_graph`, `workflow_definition`, `lens_draft`, `runner_metadata`, `non_secret_pref`, `automation_registry_entry` | Default policy: LWW per field with vector clock |

Object class metadata is declared in [`libs/infra/gateway/src/lib/object-classes.ts`](../../libs/infra/gateway/src/lib/object-classes.ts) with the merge function pinned per class. Conflicts that cannot be resolved automatically are surfaced via `lf gateway sync status` and the web Devices feature for interactive merge.

### 8. Daemon (`apps/gateway/`)

A new Nx Node application. Two binaries:

- **`lf-gatewayd`** — long-running daemon. Started via `lf gateway serve`.
- **`lf-gateway-init`** — one-shot bootstrapper that creates the Ed25519 keypair, registers the device, and writes daemon-side state under `~/.lenserfight/gateway/`.

Daemon boot checklist (refuses to start on any failure):

- Clock skew ≤ 5 minutes from `Date.now()` vs `Date.now()` after a network round-trip to Supabase.
- Ed25519 private key reachable from the keychain.
- A live Supabase session (or `LENSERFIGHT_API_KEY` env).
- Owner Lenser is not paused; workspace `global_kill_switch = false`.
- Bind target is loopback unless `--tailscale` was supplied.

Daemon responsibilities:

- Local HTTP/WS server on `127.0.0.1:38080` (default port; configurable).
- Optional Tailscale interface bind (auto-detect interface in CGNAT range).
- Heartbeat every 30 s via `fn_device_heartbeat`.
- Outbox flush loop (every 5 s; debounced batch up to 100 entries).
- Pull loop (every 10 s; per-class watermark advance).
- Leader election among same-Lenser peers via `devices.fn_acquire_leader_lease(p_lease_seconds INT)`.

### 9. CLI surface

Preserved (verbatim, no behavior change):

- `lf gateway models [--provider X] [--json]`
- `lf gateway devices [--trust X] [--json]`
- `lf gateway approve-device <id>` — now triggers two-step flow if the target device has a `public_key`; legacy single-step still works for legacy rows for one release.
- `lf gateway runners [--json]`
- `lf gateway status [--json]`

Added:

- `lf gateway serve [--bind 127.0.0.1] [--port 38080] [--tailscale]`
- `lf gateway doctor [--check clock|keychain|identity|daemon|sync|policy]`
- `lf gateway identity show|rotate|export-public`
- `lf gateway peers [--json]`
- `lf gateway sync status|pull|push`
- `lf gateway policy show|test`

### 10. Threat model

| Adversary | Capability | Mitigation |
|-----------|-----------|------------|
| **Compromised CLI** running with valid JWT | Submit forged attestations | Signature required; private key in OS keychain, not env |
| **Hostile peer on Tailscale** | Connect to daemon over tailnet | JWT + Ed25519 required; Tailscale presence is not authn |
| **Replay of stale attestation** | Resubmit captured envelope | `iat` window + `nonce_cache` |
| **Owner with revoked device** | Continue submitting from revoked device | RLS + DEFINER RPCs check `trust_level`; daemon refuses |
| **Cloud DB read by attacker** | Get private keys | Private keys never written to DB; only `public_key` |
| **Local file exfiltration** | Read `~/.lenserfight/gateway/` | OS keychain holds the private key, not the directory |
| **Kill-switch evasion** | Continue executions after global pause | Daemon polls policy state; refuses to start on `global_kill_switch = true`; signed attestations rejected if device `revoked/blocked/unhealthy` |
| **XP minting via forged attestation** | Forge `gateway_verified = true` | Server ignores client booleans; `xp.apply` granted only to `service_role`; trigger requires server-verified attestation |

### 11. Audit chain

`audit.hash_chains` is extended (additive — new `chain_kind = 'gateway'`):

- Device trust transitions (`pending → approved → trusted → revoked`).
- Sync outbox flush batches (per-batch hash).
- Daemon lifecycle events (start, stop, key rotation).

Each new entry includes `prev_hash`, `payload_hash`, `lenser_id`, `device_id`, `kind`, `created_at`. Verification helpers shipped in `libs/data/repositories/auditRepository`.

### 12. Rollout

See [`docs/explanation/gateway/roadmap.md`](../explanation/gateway/roadmap.md) for the phased rollout (A → G).

The rollout is **strictly additive** until Phase F (attestation hardening), at which point client-supplied trust booleans are server-overwritten. A two-release deprecation window publishes a warning before flipping the verification gate.

## Drawbacks

- **Operator burden** — running a daemon is a new requirement for verified local execution. Existing flows continue to work without it (CLI-only) but cannot reach `execution_verified` or `fully_trusted`.
- **Keychain backend variance** — `keytar`'s native bindings can be brittle on Linux without libsecret. The fallback file path is intentionally noisy.
- **Ed25519 in Postgres** — requires either `pgsodium` (Supabase has it) or an Edge Function. Cold-path latency for verification adds a few ms per attestation; acceptable.
- **Complexity surface** — the LTG introduces sync, identity, and a daemon all at once. We mitigate via strict phasing and additive migrations.

## Alternatives considered

- **Stay with self-reported trust booleans, harden via documentation only.** Rejected: anti-cheat invariants must be enforceable, not advisory.
- **Use TLS client certs (mTLS) for device identity.** Rejected for v1: certificate lifecycle is heavier than Ed25519 keys; we will revisit if peer-to-peer E2E becomes a goal.
- **Adopt JOSE / JWS for envelopes.** Considered. Rejected for v1 because we want minimal dependencies in the daemon and the database verification path; a small custom JCS+Ed25519 envelope is auditable in a few dozen lines. JWS remains a future option.
- **Use CRDTs for all conflict-aware sync.** Rejected for v1: per-class LWW-with-vector-clock covers the catalog and is much simpler. CRDTs may be revisited per object class as needed.
- **Run the daemon inside the CLI process.** Rejected: long-running and one-shot lifecycles must be separable so CI environments stay simple.

## Unresolved questions

- **U1** — Final port number for the daemon. `38080` is a placeholder; we want a port that does not collide with common dev tools.
- **U2** — Whether to require `pgsodium` or to ship the verification path via an Edge Function only. Decision after Phase A.
- **U3** — Whether `agents.workspace_settings.runner_paused` (docs) or `agent_paused` (code) is the canonical column name. Resolved in `requirements.md` and a follow-up migration that renames if needed.
- **U4** — Whether `devices.sync_outbox` should be partitioned by `lenser_id` from day one. Defer until we measure write rate.
- **U5** — Browser-based devices (the web app on a developer's machine) — are they "devices" in the LTG sense, or only daemons are? v1: only the daemon counts as a device for trust elevation; browsers remain `account_verified` at most.

## Implementation notes

Phased rollout, with each phase shipping behind feature flags and migration timestamps later than `20270511500000`.

| Phase | Theme | Migrations | Apps / libs touched |
|-------|-------|------------|---------------------|
| **A** | Repair gaps | `*_fn_runner_register_and_probe.sql`, RLS tightening, `execution.links` reconciliation | `apps/cli`, `eslint.config.js` |
| **B** | Device identity | `*_device_identity_and_heartbeat.sql` | `libs/types`, `libs/utils/signing`, `libs/utils/keychain`, `apps/cli/src/commands/gateway.ts` |
| **C** | Sync engine | `*_sync_outbox_and_watermarks.sql` | `libs/data/repositories/gateway*`, `libs/infra/gateway`, `apps/cli` |
| **D** | Local daemon | — | `apps/gateway` (new), `libs/infra/gateway` |
| **E** | Tailscale transport | — | `apps/gateway`, `libs/infra/gateway` |
| **F** | Attestation hardening | `*_signed_attestation_verification.sql`, optional `supabase/functions/verify-attestation/` | RPCs only |
| **G** | XP wiring | `*_xp_rules_invocation_triggers.sql` | DB triggers + DEFINER RPCs |

Acceptance criteria across phases:

- Every new RPC ships with `SECURITY DEFINER`, `SET search_path`, explicit `GRANT EXECUTE`, RLS policies on touched tables, append-only triggers where appropriate, and at least one negative-path SQL test.
- `lf gateway doctor` exit code is non-zero on any failed precondition; CI runs it on a smoke-test profile.
- No client may set `gateway_verified = true` directly.
- `service_role` is never present in `apps/gateway/` or `apps/cli/` runtime config.

## Related

- [Gateway Architecture](../explanation/gateway/architecture.md)
- [Trust Model](../explanation/gateway/trust-model.md)
- [Sync Model](../explanation/gateway/sync.md)
- [Security Rules](../explanation/gateway/security-rules.md)
- [Requirements Checklist](../explanation/gateway/requirements.md)
- [Rollout Roadmap](../explanation/gateway/roadmap.md)
- [`lf gateway` CLI Reference](../reference/cli/gateway.md)
- [Token Reference](../reference/platform-api/tokens.md)
- [RFC Process](rfc-process.md)
