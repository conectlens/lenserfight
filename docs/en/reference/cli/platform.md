---
title: lf platform
description: Platform-level execution control and health dashboard (admin only).
---

<!-- AUTO-GEN-START -->

# `lf platform`

Platform-level execution control and health dashboard (admin only).

## `lf platform status`

Show global execution health dashboard.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

## `lf platform emergency-stop`

Activate the system-wide kill switch (admin only). New executions halt immediately.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reason` | string | yes | Reason for the emergency stop (required) |
| `--force` | boolean | no | Skip interactive confirmation (for CI/scripted use) |

## `lf platform kill-all`

Activate system kill switch AND cancel all in-flight runs and battle jobs (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reason` | string | yes | Reason for the kill-all (required) |
| `--force` | boolean | no | Skip interactive confirmation (for CI/scripted use) |

## `lf platform resume`

Lift a platform kill switch to resume autonomous operations (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Kill switch UUID (from: lf kill-switch platform list) |

## `lf platform queue-freeze`

Freeze the scheduled-workflow dispatch queue without cancelling in-flight runs (admin only).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reason` | string | yes | Reason for the queue freeze (required) |
| `--force` | boolean | no | Skip interactive confirmation |

## `lf platform queue-unfreeze`

Resume the scheduled-workflow dispatch queue after a freeze (admin only).

## `lf platform scheduler-disable`

Disable the automated workflow scheduler (alias for queue-freeze).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reason` | string | yes | Reason for disabling the scheduler (required) |
| `--force` | boolean | no | Skip interactive confirmation |

## `lf platform scheduler-enable`

Re-enable the automated workflow scheduler (alias for queue-unfreeze).

<!-- AUTO-GEN-END -->
