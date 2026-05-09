---
title: lf kill-switch
description: "Manage kill switches: per-agent (on/off/status) and platform-wide (platform on/off/list)."
---

<!-- AUTO-GEN-START -->

# `lf kill-switch`

Manage kill switches: per-agent (on/off/status) and platform-wide (platform on/off/list).

## `lf kill-switch on`

Activate a platform-wide kill switch (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--scope` | string | yes | Scope: system | battle | agent | run |
| `--target` | string | no | Target UUID (omit for system-wide) |
| `--reason` | string | yes | Reason for activation (required) |
| `--expires-at` | string | no | ISO 8601 expiry (omit = permanent until lifted) |
| `--confirm` | boolean | no | Required: confirm activation |

## `lf kill-switch off`

Lift a platform kill switch by ID (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Kill switch UUID |

## `lf kill-switch list`

List all platform kill switches (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

<!-- AUTO-GEN-END -->
