---
title: Sync Model
description: Three sync scopes, per-object-class authority, conflict resolution, outbox + watermarks.
---

# Sync Model

The LTG synchronizes state across three scopes. Each scope has its own transport, its own authentication assumptions, and its own conflict policy. Object-class authority (cloud-only / local-only / conflict-aware) is declared per type.

## Three sync scopes

### Scope A — Local devices on one Lenser account

| Aspect | Decision |
|--------|----------|
| Transport | `127.0.0.1` HTTP/WS, mDNS for discovery |
| Bind by default | `127.0.0.1:38080` only — never `0.0.0.0` |
| Authentication | Ed25519 device signature + Supabase JWT |
| Authorization | Same `lenser_id` AND `trust_level ∈ {approved, trusted}` |
| Liveness | mDNS + 30 s heartbeat against cloud |
| Conflict policy | Leader-elects (oldest trusted device wins write coordination) |

### Scope B — Tailscale / private-network devices

| Aspect | Decision |
|--------|----------|
| Transport | WireGuard via Tailscale (CGNAT `100.64.0.0/10`); generalizable to any private interface |
| Bind | Off by default. Requires `lf gateway serve --tailscale` AND a passing `lf gateway doctor`. |
| Authentication | Ed25519 device signature + Supabase JWT — **Tailscale identity is ignored for authn** |
| Authorization | Same as Scope A |
| Conflict policy | Same as Scope A |

The single existing Tailscale reference in [`libs/utils/dom/src/lib/authReturnUrl.ts`](../../../libs/utils/dom/src/lib/authReturnUrl.ts) is documentary only; the runtime detector lives in `libs/infra/gateway/src/lib/tailscale-detector.ts`.

### Scope C — Cloud sync

| Aspect | Decision |
|--------|----------|
| Transport | Supabase REST / RPC / Realtime (`postgres_changes` + `broadcast`) |
| Authentication | Supabase JWT for reads; Supabase JWT + signed envelope for trust-state mutations |
| Authorization | RLS deny-by-default + `SECURITY DEFINER` RPCs |
| Conflict policy | Per-object-class merge function (default LWW + vector clock) |

## Object class authority

Every sync candidate belongs to exactly one object class. Authority is declared in [`libs/infra/gateway/src/lib/object-classes.ts`](../../../libs/infra/gateway/src/lib/object-classes.ts).

### Cloud-authoritative (read-only on edges)

| Class | Source of truth | Local representation |
|-------|-----------------|----------------------|
| `xp_total` | `xp.totals` | Pull-only cache |
| `trust_evaluation` | `execution.trust_evaluations` | Pull-only cache |
| `battle_result` | `battles.battles` (status='published') | Pull-only cache |
| `policy` | `agents.workspace_settings` | Pull-only cache |
| `budget` | `agents.workspace_settings` | Pull-only cache |
| `kill_switch` | `agents.workspace_settings.global_kill_switch` | Pull-only; daemon polls every 10 s |
| `dark_launch` | `agents.workspace_settings.dark_launch_*` | Pull-only |
| `ai_catalog` | `ai.providers` / `ai.models` | Pull-only cache, daily refresh |

Edges may not push these. Attempts to push are rejected at the daemon and at the RPC.

### Local-authoritative (never sync raw)

| Class | Where it lives | Why local-only |
|-------|----------------|----------------|
| `byok_key` | OS keychain (via `libs/utils/keychain`) or env | Never written to DB; documented in [`libs/providers/src/lib/byok-key-resolver.ts`](../../../libs/providers/src/lib/byok-key-resolver.ts) |
| `local_battle` | `.lenserfight/local-battles/*.json` (encrypted) | AES-256-GCM envelope; passphrase from env |
| `scratchpad_draft` | Daemon process memory | Ephemeral |
| `keychain_entry` | OS keychain | Never leaves the device |
| `private_key` | OS keychain | Never leaves the device |

If raw cloud sync is ever attempted on these classes, the daemon refuses with `local_only_class`.

### Conflict-aware (bidirectional)

| Class | Cloud table(s) | Default merge policy |
|-------|----------------|----------------------|
| `agent_config` | `agents.ai_lensers` | LWW per field with vector clock |
| `agent_team_graph` | `agents.teams`, `agents.team_edges` | LWW per edge with vector clock |
| `workflow_definition` | `lenses.workflows`, `lenses.versions` | LWW per version with `created_at` tiebreak |
| `lens_draft` | `lenses.lenses` (draft state only) | LWW per field |
| `runner_metadata` | `execution.runner_adapters` (config JSON only) | LWW per field |
| `non_secret_pref` | `lensers.preferences` | LWW per field |
| `automation_registry_entry` | none (cloud mirror table TBD) | LWW per entry |

Conflicts that the merge function cannot auto-resolve (e.g. structured conflict in workflow steps) are surfaced via:

- `lf gateway sync status --conflicts`
- The web Devices feature in `libs/features/devices`

## Outbox + watermarks

### `devices.sync_outbox`

```sql
CREATE TABLE devices.sync_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id    UUID NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  device_id    UUID NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  object_class TEXT NOT NULL,
  object_id    TEXT NOT NULL,
  op           TEXT NOT NULL CHECK (op IN ('upsert','delete')),
  payload      JSONB NOT NULL,
  vclock       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Writers: device daemons (via `fn_sync_push`).
Readers: cloud-side merge job (via `fn_sync_apply_outbox` / cron).
Retention: 30 days, then archived to `audit.events`.

### `devices.sync_watermarks`

```sql
CREATE TABLE devices.sync_watermarks (
  lenser_id    UUID NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  device_id    UUID NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  object_class TEXT NOT NULL,
  watermark    TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  PRIMARY KEY (device_id, object_class)
);
```

Updated by `fn_sync_pull` after successfully returning rows newer than `watermark`. The pull is idempotent — replaying with the same watermark returns the same set.

### `devices.nonce_cache`

```sql
CREATE TABLE devices.nonce_cache (
  nonce      TEXT PRIMARY KEY,
  device_id  UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
```

10-minute retention. Cleaned by cron. Replaying a nonce within the window is rejected as `nonce_replay`.

## Sync RPCs

| RPC | Purpose | Caller |
|-----|---------|--------|
| `devices.fn_sync_push(p_envelope JSONB)` | Verify envelope, walk `body.entries[]`, apply each entry per its class. | Daemon |
| `devices.fn_sync_pull(p_object_classes TEXT[], p_limit INT, p_envelope JSONB)` | Verify envelope, return rows newer than watermark for each class, advance watermarks atomically. | Daemon |
| `devices.fn_sync_status()` | Return per-class watermarks + outbox depth + last error. | Daemon, CLI |
| `devices.fn_sync_resolve_conflict(p_conflict_id UUID, p_winner JSONB)` | Apply user resolution from `lf gateway sync status` or web UI. | CLI, web |

All sync RPCs are `SECURITY DEFINER` with `SET search_path = devices, lensers, public, extensions`, granted to `authenticated` only.

## Leader election

For local-mesh write coordination (e.g. who flushes the outbox if multiple devices are online), `devices.peer_leases` holds time-bounded leases:

```sql
CREATE TABLE devices.peer_leases (
  lease_kind  TEXT NOT NULL,                       -- e.g. 'sync_flush'
  lenser_id   UUID NOT NULL,
  device_id   UUID NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (lease_kind, lenser_id)
);
```

`devices.fn_acquire_leader_lease(p_kind TEXT, p_lease_seconds INT)` returns the current holder; if expired, atomically grants to the caller. Tiebreak: oldest `trust_level='trusted'` device wins; if no trusted device, oldest `approved` device wins.

## Failure modes and recovery

| Failure | Behavior |
|---------|----------|
| Outbox push fails | Retry with exponential backoff; daemon surfaces via `gateway_status='degraded'`. Outbox is durable; nothing is lost. |
| Pull fails | Watermark is not advanced; next pull retries. |
| Nonce replay | RPC returns `nonce_replay`; daemon discards envelope, regenerates nonce. |
| Clock skew detected | Daemon refuses to start (`> 5 min`); `lf gateway doctor` reports. |
| Conflict cannot auto-merge | Conflict row written; `lf gateway sync status --conflicts` lists it; user resolves via CLI or web. |
| Local-only class push attempted | Daemon refuses with `local_only_class`; logged to audit chain. |
