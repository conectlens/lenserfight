---
title: lf gateway
description: Manage the LenserFight Trust Gateway (LTG) — local devices, runners, model routing, daemon, identity, peers, sync, and policy.
---

# `lf gateway`

`lf gateway` is the operator surface for the [LenserFight Trust Gateway (LTG)](../../explanation/gateway/index.md). It manages model routing, local trusted devices, runners, the long-running gateway daemon, per-device identity, peers, bidirectional sync, and policy state.

The command preserves every existing subcommand verbatim and adds new ones for the daemon era.

## Overview

```text
lf gateway <subcommand> [args]

  models            Inspect provider/model routing classes (catalog).
  devices           List and filter registered local devices.
  approve-device    Approve a pending device (two-step: requires public key + challenge).
  runners           List runners with their bound trusted devices.
  status            Aggregated health overview (devices + runners).

  serve             Start the long-running daemon (apps/gateway).
  doctor            Run trust gateway self-tests.
  identity          Manage this device's Ed25519 keypair.
  peers             List peer devices on the same Lenser account.
  sync              Inspect / pull / push outbox state.
  policy            Inspect kill switch / runner_paused / budget / dark-launch state.
```

`lf agent` and `lf gateway` are independent. Runner pause/resume lives under `lf runner`.

---

## Preserved subcommands (existing behavior)

### `lf gateway models`

Show the provider/model catalog with route classification (`local` / `native-adapter` / `byok` / `catalog-only` / `blocked`).

```bash
lf gateway models
lf gateway models --provider anthropic
lf gateway models --json
```

| Flag | Description | Default |
|------|-------------|---------|
| `--provider` | Filter by provider key | unset |
| `--json` | JSON output | `false` |

Backed by `fn_ai_catalog_models`. No auth required.

### `lf gateway devices`

List devices for the current Lenser. Filter by trust level.

```bash
lf gateway devices
lf gateway devices --trust pending
lf gateway devices --trust trusted --json
```

| Flag | Description | Default |
|------|-------------|---------|
| `--trust` | `pending` / `approved` / `trusted` / `revoked` / `unhealthy` / `offline` / `blocked` | unset |
| `--json` | JSON output | `false` |

Backed by `devices.fn_device_list`.

### `lf gateway approve-device`

Approve a pending device.

```bash
lf gateway approve-device <device-id>
```

Two-step semantics from Phase B onward:

- The pending device MUST have already posted a signed challenge (`fn_device_post_challenge`).
- Approval verifies the signature against the device's submitted public key and flips `trust_level: pending → approved`.
- Devices without a public key (legacy) still approve via the original `fn_device_approve` for one release.

### `lf gateway runners`

List runners and their bound trusted devices.

```bash
lf gateway runners
lf gateway runners --json
```

Backed by `execution.fn_runner_list_with_devices`.

### `lf gateway status`

Aggregated health overview.

```bash
lf gateway status
lf gateway status --json
```

Counts: trusted / approved / pending devices and active runners. Does not contact the daemon.

---

## New subcommands (Phase D onward)

### `lf gateway serve`

Start the long-running daemon (`lf-gatewayd`).

```bash
lf gateway serve
lf gateway serve --port 38080
lf gateway serve --bind 127.0.0.1 --port 38080
lf gateway serve --tailscale
```

| Flag | Description | Default |
|------|-------------|---------|
| `--bind` | Interface to bind | `127.0.0.1` |
| `--port` | Port | `38080` |
| `--tailscale` | Also bind the detected Tailscale (CGNAT 100.64/10) interface | `false` |

Daemon refuses to start if any of:

- clock skew > 5 minutes,
- no Ed25519 key in keychain,
- no Supabase session,
- owner Lenser is paused,
- workspace `global_kill_switch=true`.

### `lf gateway doctor`

Run trust gateway self-tests. Each check prints a pass/fail line; exit code is non-zero on any failure.

```bash
lf gateway doctor
lf gateway doctor --check clock
lf gateway doctor --check clock,identity,daemon
lf gateway doctor --json
```

| Check | Verifies |
|-------|----------|
| `clock` | Skew < 5 min vs Supabase. |
| `keychain` | Backend reachable; can read/write a smoke entry. |
| `identity` | Ed25519 keypair present; not older than rotation policy. |
| `daemon` | `lf-gatewayd` reachable on its bind address; healthy. |
| `sync` | Outbox depth below threshold; watermarks fresh; no unresolved conflicts. |
| `policy` | Reads `global_kill_switch`, `runner_paused`. |
| `transport` | Reports current bind set; warns on accidental public bind. |

Default (`--check` unspecified) runs all checks. CI uses `--check clock,identity,daemon`.

### `lf gateway identity`

Manage the device's Ed25519 keypair.

```bash
lf gateway identity show
lf gateway identity rotate
lf gateway identity export-public
lf gateway identity export-public --json
```

| Subcommand | Effect |
|------------|--------|
| `show` | Show key id, fingerprint, age, algorithm. |
| `rotate` | Generate a new keypair, register the new public key, mark the old as revoked. |
| `export-public` | Print the base64 public key (safe to share). |

The private key NEVER leaves the OS keychain. `rotate` and `show` work without the daemon running.

### `lf gateway peers`

List peer devices on the same Lenser account.

```bash
lf gateway peers
lf gateway peers --json
```

Columns: device id (short), name, role (`leader` / `follower`), trust level, last heartbeat, gateway status.

Combines local mDNS discovery (when daemon is running) with cloud-known peers.

### `lf gateway sync`

Inspect or trigger sync.

```bash
lf gateway sync status
lf gateway sync status --conflicts
lf gateway sync pull
lf gateway sync push
lf gateway sync push --dry-run
```

| Subcommand | Effect |
|------------|--------|
| `status` | Per-class watermarks, outbox depth, unresolved conflict count. `--conflicts` lists conflict rows. |
| `pull` | One-shot pull from cloud across all conflict-aware classes. |
| `push` | One-shot flush of the outbox. `--dry-run` validates without writing. |

The daemon runs these loops automatically; the CLI is for manual reconciliation and CI.

### `lf gateway policy`

Inspect or test policy state.

```bash
lf gateway policy show
lf gateway policy show --json
lf gateway policy test --kind kill-switch
lf gateway policy test --kind runner-paused
```

| Subcommand | Effect |
|------------|--------|
| `show` | Current `global_kill_switch`, `runner_paused`, `budget_enforce`, `max_parallel_runs`, `dark_launch_enabled`, `dark_launch_pct`. |
| `test` | Issue a noop signed envelope to confirm the policy gate is enforced. |

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All operations succeeded / all checks passed. |
| `1` | Generic failure (network, server error, validation). |
| `2` | Auth required or session expired. |
| `3` | Doctor failed at least one check. |
| `4` | Daemon not reachable (`serve` not running). |
| `5` | Trust state blocks the operation (revoked / unhealthy / kill-switch). |

---

## Environment

The gateway respects all CLI environment variables described in [`docs/reference/cli/configuration.md`](configuration.md). The following are gateway-specific:

| Variable | Purpose |
|----------|---------|
| `LF_GATEWAY_PORT` | Override default daemon port (`38080`). |
| `LF_GATEWAY_BIND` | Override default daemon bind (`127.0.0.1`). |
| `LF_GATEWAY_KEY_FILE_FALLBACK` | `1` to enable file-based keypair backend (CI only — strongly discouraged elsewhere). |
| `LF_GATEWAY_DOCTOR_TIMEOUT_MS` | Override doctor timeout. |

---

## Related

- [LenserFight Trust Gateway (LTG)](../../explanation/gateway/index.md)
- [RFC-0003: LenserFight Trust Gateway](../../rfcs/RFC-0003-trust-gateway.md)
- [Architecture](../../explanation/gateway/architecture.md)
- [Trust Model](../../explanation/gateway/trust-model.md)
- [Sync Model](../../explanation/gateway/sync.md)
- [Security Rules](../../explanation/gateway/security-rules.md)
- [Requirements](../../explanation/gateway/requirements.md)
- [Roadmap](../../explanation/gateway/roadmap.md)
- [`lf runner`](agent.md)
- [`lf doctor`](../../reference/cli/index.md#start-here)
