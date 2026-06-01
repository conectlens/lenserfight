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
  consent           Grant/revoke explicit non-loopback bind consent (Tailscale).
```

`lf agent` and `lf gateway` are independent. Lenser pause/resume lives under `lf lenser`.

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
| `--tailscale` | Also bind the detected Tailscale (CGNAT 100.64/10) interface (requires consent — see `lf gateway consent grant tailscale`) | `false` |

Daemon refuses to start if any precondition fails:

| Precondition | Check | Fix |
|---|---|---|
| `bind_safe` | `--bind 0.0.0.0` forbidden in full mode | Use `127.0.0.1` or add `--keys-only` |
| `no_service_role` | `SUPABASE_SERVICE_ROLE_KEY` must not be set | Unset the env var |
| `clock_skew` | Clock within 5 min of Supabase | Fix system clock |
| `keychain_present` | OS keychain or file-backend reachable | Check `~/.lenserfight/gateway/keys/` permissions |
| `keys_passphrase` | Master passphrase configured | `lf keys init` |
| `identity_present` | Ed25519 keypair present (full mode only) | `lf gateway identity init` |
| `session_present` | Supabase session exists (full mode only) | `lf login` |
| `lenser_active` | Owner Lenser not paused (full mode only) | Unpause the Lenser |
| `kill_switch` | `global_kill_switch=false` (full mode only) | Contact workspace admin |
| `tailscale_consent` | Consent file matches live interface (when `--tailscale`) | `lf gateway consent grant tailscale` |

`--keys-only` skips the full-mode-only preconditions (`identity_present`, `session_present`, `lenser_active`, `kill_switch`) and also allows `--bind 0.0.0.0`.

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
| `daemon` | `lf-gatewayd` bundle exists in `dist/apps/gateway/main.js` (offline-safe CI check). |
| `sync` | Preview: skipped unless a signed identity-backed sync probe is available. |
| `policy` | Reads `global_kill_switch`, `runner_paused`. |
| `transport` | Reports current bind set; warns on accidental public bind. |

Default (`--check` unspecified) runs all checks. CI uses `--check daemon,transport` because it is offline-safe and does not require an Ed25519 identity or Supabase session.

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
| `rotate` | Generate a new keypair locally and print the new public key for cloud registration. |
| `export-public` | Print the base64 public key (safe to share). |

The private key NEVER leaves the OS keychain. `rotate` and `show` work without the daemon running.

### Daemon HTTP surface

Once `lf gateway serve` is running, the daemon exposes a small loopback HTTP API. All endpoints are bound to `127.0.0.1` (or your approved Tailscale CGNAT address) by default.

| Route | Method | Description |
|-------|--------|-------------|
| `/healthz` | GET | `{status, device_id, daemon_version, time}` |
| `/identity` | GET | Returns `{public_key, generated_at, daemon_version}` from `identity.json`. The private key is never returned. |
| `/peers` | GET | Peers discovered on the same Lenser account. |
| `/outbox` | GET | `{pending}` — depth of the local outbox awaiting push to cloud. |
| `/sync/pull` | POST | Manually trigger a single sync pull. Returns `{claimed}` (number of commands claimed and dispatched). |

The daemon also runs three background loops:

| Loop | Cadence | Source |
|------|---------|--------|
| `heartbeat` | `LF_GATEWAY_HEARTBEAT_INTERVAL_MS` (default `30000`) | `fn_gateway_heartbeat` — upserts the device row, returns `{approved, kill_switch}`. A `kill_switch: true` flag triggers a clean shutdown. |
| `sync` | `LF_GATEWAY_PULL_INTERVAL_MS` (default `10000`) | `fn_gateway_claim_commands` → dispatch → `fn_gateway_ack_commands`. |
| `outbox` | `LF_GATEWAY_OUTBOX_INTERVAL_MS` (default `5000`) | Future: signed push of local writes. |

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
| `pull` | Preview stub in the OSS release candidate; continuous pull is daemon-owned. |
| `push` | Preview stub in the OSS release candidate; signed one-shot push is deferred. |

The daemon runs these loops automatically; the CLI is for manual reconciliation and CI.

### `lf gateway policy`

Inspect or test policy state.

```bash
lf gateway policy show
lf gateway policy show --json
lf gateway policy test --kind kill-switch
lf gateway policy test --kind lenser-paused
```

| Subcommand | Effect |
|------------|--------|
| `show` | Current `global_kill_switch`, `runner_paused`, `budget_enforce`, `max_parallel_runs`, `dark_launch_enabled`, `dark_launch_pct`. |
| `test` | Preview stub that identifies the server-side policy gate used by executions. |

### Command envelope security (Phase BG)

As of Phase BG the daemon pulls commands via `fn_gateway_claim_commands_v2`, which returns two additional columns:

| Column | Purpose |
|--------|---------|
| `envelope_sig` | base64url Ed25519 signature over the canonical JCS encoding of `{id, device_id, command_type, payload, created_at, envelope_nonce}`. |
| `envelope_nonce` | random 128-bit nonce sealed inside the signed envelope. Lets the daemon detect replays of an old (still-valid) signature. |

The daemon calls `verifyCommandSignature` on every claimed row before dispatch. Verification proceeds against the cloud signing public key (configure via the daemon identity material). Outcomes:

- **Valid signature** → command is dispatched as usual.
- **Invalid signature / tampered payload** → command is `ack`-ed (so the cloud sees no retries) and logged to stderr; **not dispatched**.
- **Unsigned command + a configured public key** → refused (same as invalid).
- **Unsigned command + no public key configured** → accepted (legacy migration window).
- **`LF_GATEWAY_SKIP_SIG_VERIFY=true` in env** → verification short-circuits to true. Local dev and tests only — never set this in production.

The deprecated v1 RPC (`fn_gateway_claim_commands`) still works for older daemons, but every new release should pull from v2.

---

### Health dashboard (Phase BE)

The web app at `/settings/gateway` polls `fn_get_gateway_device_health()` every
30 seconds and renders:

- **Summary cards** — total daemons, online (last_seen ≤ 5 min), and total
  pending commands across all your daemons.
- **Status dot** — green if `last_seen_at < 5 min`, amber up to 30 min, red
  otherwise (or any time `revoked_at` is set).
- **Pending column** — count of unclaimed entries in `agents.gateway_commands`
  for that daemon. A non-zero number means the daemon is either offline or
  behind on its sync pull.

The dashboard is owner-scoped: the RPC filters rows to `owner_id = auth.uid()`,
so users only ever see their own daemons even when service_role inserts commands
on their behalf.

---

### `lf gateway daemons` (Phase BB)

Manage long-running gateway daemon registrations (`agents.gateway_devices`). This is distinct from `lf gateway devices`, which targets the older `devices.*` trusted-device flow used by RFC-0003.

```bash
# List your registered daemons.
lf gateway daemons list
lf gateway daemons list --json
lf gateway daemons list --limit 100

# Approve a daemon — the daemon's next heartbeat returns approved=true.
lf gateway daemons approve <device-id>

# Revoke a daemon — sets kill_switch=true; the daemon will shut itself
# down on the next heartbeat. Use --force to skip the confirmation.
lf gateway daemons revoke <device-id>
lf gateway daemons revoke <device-id> --force
```

The `list` output uses a short device ID prefix. Status columns:
- **Approved** — `yes` once `approved_at` has been set by `lf gateway daemons approve`.
- **Kill** — `yes` once `revoked_at` is set; the daemon will exit on next heartbeat.

All three commands are owner-scoped via `fn_gateway_approve_device`, `fn_gateway_revoke_device`, `fn_list_gateway_devices` and refuse to act on a device whose `owner_id` does not match the calling user (RPC returns `42501` `device_not_owned`).

---

### `lf gateway pair`

Print the bearer token the web app uses to authenticate against `/keys/*`. Running this once is required before you can paste a token into the Funding panel.

```bash
lf gateway pair --web     # print the token with pairing instructions (default)
lf gateway pair --rotate  # rotate to a new token (invalidates the old one immediately)
```

The token is generated on first call and stored in the OS keychain (or the file-backend fallback). The gateway daemon auto-reads the same token on startup and prints it in the colored pairing box. You do not need to re-run `lf gateway pair` after a daemon restart — only after closing and reopening the browser tab (because `sessionStorage` is cleared on tab close).

| Flag | Description | Default |
|------|-------------|---------|
| `--web` | Print token with step-by-step pairing instructions | `true` |
| `--rotate` | Replace the stored token with a new one | `false` |

### `lf gateway consent`

Grant or revoke explicit consent for the daemon to bind on a non-loopback interface. v1 supports `tailscale`; the consent file lives at `~/.lenserfight/gateway/tailscale-consent.json` and is the canonical source the daemon trusts.

```bash
lf gateway consent show
lf gateway consent grant tailscale
lf gateway consent grant tailscale --notes "alice macbook, home Tailnet"
lf gateway consent revoke
```

Consent records pin the *interface fingerprint* (`name:cidr-or-address`). If the live interface no longer matches, the daemon refuses with `tailscale_consent: fingerprint_mismatch` until the user re-grants. This protects against silent IP/range changes from being treated as already-trusted exposure.

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
- [`lf lenser`](agent.md)
- [`lf doctor`](../../reference/cli/index.md#start-here)

<!-- AUTO-GEN-START -->

# `lf gateway`

Manage local devices, lensers, daemon, identity, peers, sync, policy, and routing.

<!-- AUTO-GEN-END -->
