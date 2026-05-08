---
title: Security Rules
description: Zero trust, least privilege, signed envelopes, replay protection, secret handling, kill switch, audit, defense-in-depth.
---

# Security Rules

These are the security rules that govern the LTG. They are enforced at multiple layers: the daemon, the libs, the CLI, and Postgres. Each rule is testable and auditable.

## R1 — Zero trust between transport and authorization

- **R1.1** — Loopback presence is not authentication.
- **R1.2** — Tailscale presence is not authentication.
- **R1.3** — A Supabase JWT alone is insufficient for trust elevation; a signed envelope with a registered device public key is also required.
- **R1.4** — The daemon refuses to accept signed envelopes whose `kid` is not a `devices.registered_devices.id` belonging to the JWT-authenticated Lenser.

## R2 — Least privilege

- **R2.1** — `service_role` is never present in `apps/gateway/` runtime config or `apps/cli/` runtime config.
- **R2.2** — All sensitive table mutations go through `SECURITY DEFINER` RPCs with `SET search_path` (existing pattern in [`supabase/migrations/20270511200000_devices_schema.sql`](../../../supabase/migrations/20270511200000_devices_schema.sql)).
- **R2.3** — All new tables ENABLE ROW LEVEL SECURITY by default; no policy means no access.
- **R2.4** — All new RPCs declare `GRANT EXECUTE ... TO authenticated` (or `service_role`) explicitly.
- **R2.5** — `xp.apply` remains granted to `service_role` only; new XP-minting paths route through DEFINER RPCs that themselves call `xp.apply`.

## R3 — Signed envelopes

- **R3.1** — Canonical shape: `{ v: 1, alg: 'ed25519', kid, iat, nonce, body, sig }`.
- **R3.2** — Canonicalization: JCS (RFC 8785).
- **R3.3** — Hash: SHA-256 over the JCS output of `{v, alg, kid, iat, nonce, body}`.
- **R3.4** — Signature: detached Ed25519, base64url.
- **R3.5** — Verification is performed in Postgres (`fn_verify_attestation_signature`) using `pgsodium`, OR by the Edge Function `supabase/functions/verify-attestation/`. Never by an untrusted client.
- **R3.6** — A signed envelope is single-use across the replay window.

## R4 — Replay protection

- **R4.1** — `iat` window: ±300 seconds from server clock.
- **R4.2** — `nonce` is 128-bit cryptographically random, base64url-encoded.
- **R4.3** — `devices.nonce_cache` retains nonces for 600 seconds; replays are rejected with `nonce_replay`.
- **R4.4** — Daemon `lf gateway doctor --check clock` MUST pass before any signed RPC is sent.

## R5 — Secret handling

- **R5.1** — Private keys live in the OS keychain via [`libs/utils/keychain`](../../../libs/utils/keychain). They are never written to:
  - the database,
  - `~/.lenserfight/config.json`,
  - any project-level file (`.lenserfight.json`, `.lenserfight/*`),
  - environment variables.
- **R5.2** — BYOK API keys remain in env or OS keychain per [`libs/providers/src/lib/byok-key-resolver.ts`](../../../libs/providers/src/lib/byok-key-resolver.ts). The daemon never logs them.
- **R5.3** — Supabase `service_role` key, when present in development, is read only from env. The daemon refuses to start if it sees one (`service_role_in_daemon`).
- **R5.4** — Profile JSON files (`~/.lenserfight/profiles/*.json`) remain mode `0600`. Daemon-side state goes under `~/.lenserfight/gateway/` with the same file mode.

## R6 — Kill switch propagation

- **R6.1** — `agents.workspace_settings.global_kill_switch = true` causes the daemon to refuse to start and the CLI to refuse new executions.
- **R6.2** — Device `trust_level ∈ {revoked, blocked, unhealthy}` causes the daemon to refuse to sign attestations on behalf of that device.
- **R6.3** — Workspace `runner_paused = true` (canonical column name; see [`requirements.md`](requirements.md) §RP) causes the daemon to refuse new executions for that workspace.
- **R6.4** — Daemon polls policy state every 10 s; CLI polls on every command unless cached < 60 s.

## R7 — Audit chain

- **R7.1** — Device trust transitions (`pending → approved → trusted → revoked → ...`) are appended to `audit.hash_chains` with `chain_kind = 'gateway'`.
- **R7.2** — Sync outbox flushes are appended in batches with one hash per batch.
- **R7.3** — Daemon lifecycle events (start, stop, key rotation, refusal causes) are appended.
- **R7.4** — Audit chain entries are append-only (enforced by `public.fn_deny_mutation`).
- **R7.5** — Verification helpers expose `chain_verify(p_lenser_id UUID)` for incident response.

Example query (read-only):

```sql
SELECT created_at, kind, device_id, prev_hash, payload_hash
  FROM audit.hash_chains
 WHERE chain_kind = 'gateway'
   AND lenser_id = $1
 ORDER BY created_at DESC
 LIMIT 200;
```

## R8 — Defense in depth

Every trust elevation crosses **at least three** independent layers:

1. **Signature** — verified server-side.
2. **DB policy** — RLS + DEFINER RPC.
3. **Audit trigger** — append-only, hash-chained.

A single layer failure cannot silently elevate trust. For example, even if a malicious daemon manages to call a DEFINER RPC, the signature verification rejects the call before any row is written.

## R9 — Anti-cheat

- **R9.1** — Clients may not set `gateway_verified = true` directly. Server overwrites the field after signature verification.
- **R9.2** — Clients may not set `device_trusted = true`. Server reads from `devices.registered_devices.trust_level` at attestation time.
- **R9.3** — Clients may not set `policy_passed = true`. Server reads the latest `agents.policy_evaluations` verdict for the run.
- **R9.4** — `execution_verified` and `fully_trusted` trust levels require server-set fields only.
- **R9.5** — Battle reputation pipelines consume only server-derived levels.

## R10 — Localhost exposure

- **R10.1** — Daemon binds `127.0.0.1` by default. Never `0.0.0.0`.
- **R10.2** — Adding a non-loopback bind requires an explicit CLI flag (`--tailscale`, future `--bind`).
- **R10.3** — Doctor verifies that no public network interface accidentally hosts the daemon.

## R11 — Config ownership

- **R11.1** — `.lenserfight.json` (project-level, commit-safe): NO secrets, NO tokens, NO keys. Existing `ProjectConfig` shape in [`apps/cli/src/config/project-config.ts`](../../../apps/cli/src/config/project-config.ts) is authoritative.
- **R11.2** — `~/.lenserfight/config.json` (user-level): tokens only; NEVER signing keys.
- **R11.3** — `~/.lenserfight/gateway/state.json` (daemon-level): non-secret runtime state (last heartbeat, current peer roster cache).
- **R11.4** — OS keychain: signing keys, optionally BYOK keys.
- **R11.5** — Environment: bootstrap secrets only (Supabase URL, anon key, optional dev tokens).

## R12 — Workflow trust

- **R12.1** — A workflow run reaches `fully_trusted` only when both the workflow definition and its lens version are hashed into the attestation envelope (`workflow_hash`, `lens_hash`).
- **R12.2** — Workflows fetched at runtime are pinned to a specific `lenses.versions.id`. Mutations to a referenced version invalidate any in-flight attestation.
- **R12.3** — Tool invocations within a workflow are themselves logged to `agents.tool_invocations` and contribute to the trust factor `policy_passed`.

## Doctor checklist

`lf gateway doctor` is the single command that verifies most of the above:

- `--check clock` — clock skew within 5 minutes of Supabase.
- `--check keychain` — keychain backend reachable; can read/write a smoke entry.
- `--check identity` — Ed25519 keypair present; not older than rotation policy.
- `--check daemon` — `lf-gatewayd` reachable on its bind address; healthy.
- `--check sync` — outbox depth below threshold; watermarks fresh; no unresolved conflicts.
- `--check policy` — `global_kill_switch`, `runner_paused` state; daemon not in degraded mode.
- `--check transport` — no public bind; if `--tailscale`, tailnet interface detected.

Doctor exit code is non-zero on any failed check; CI runs `lf gateway doctor --check clock,identity,daemon` after every PR that touches `apps/gateway`, `apps/cli`, `libs/infra/gateway`, `supabase/migrations/**`, or `supabase/functions/**`.
