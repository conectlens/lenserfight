---
title: lf kill-switch
description: "Manage kill switches: per-agent (on/off/status) and platform-wide (platform on/off/list)."
---

<!-- AUTO-GEN-START -->

# `lf kill-switch`

Manage kill switches: per-agent (on/off/status) and platform-wide (platform on/off/list).

## `lf kill-switch on`

Activate the kill switch for a specific agent. All new runs for that agent are blocked immediately. Reversible — lift with `lf kill-switch off <handle>`.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent @handle |
| `--confirm` | boolean | no | Required: confirm activation |

**Confirmation:** Pass `--confirm` to proceed. In CI without the flag the command exits 1 with an impact summary. Every activation is written to `~/.lenserfight/audit.log`.

## `lf kill-switch platform on`

Activate a platform-scoped kill switch (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--scope` | string | yes | `system` \| `battle` \| `agent` \| `run` |
| `--target` | string | no | Target UUID (omit for scope-wide) |
| `--reason` | string | yes | Reason for activation |
| `--expires-at` | string | no | ISO 8601 expiry (omit = permanent until lifted) |
| `--force` | boolean | no | Skip interactive confirmation (required in CI) |

**Confirmation — two tiers based on `--scope`:**

| Scope | Risk | Method | Force flag |
|---|---|---|---|
| `system` | CRITICAL | Type `PLATFORM DOWN` exactly | `--force` bypasses typed prompt |
| `battle` / `agent` / `run` | HIGH | Pass `--force` | `--force` required |

> **Breaking change:** The old `--confirm` flag has been replaced by `--force` on this subcommand. Update any scripts that used `lf kill-switch platform on --confirm`.

## `lf kill-switch platform off`

Lift a platform kill switch by ID (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Kill switch UUID |

## `lf kill-switch platform list`

List all platform kill switches (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

## `lf kill-switch off`

Lift the kill switch for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent @handle |

## `lf kill-switch status`

Show the current kill switch state for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent @handle |

<!-- AUTO-GEN-END -->
