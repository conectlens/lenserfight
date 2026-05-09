---
title: lf policy
description: Inspect agent policy evaluations.
---

<!-- AUTO-GEN-START -->

# `lf policy`

Inspect agent policy evaluations.

## `lf policy log`

Show policy evaluation log for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--limit` | string | no | Max rows to return (default 20) |
| `--verdict` | string | no | Filter by verdict: allow | deny | pause | require_approval |
| `--json` | boolean | no | Output as JSON |

## `lf policy stats`

Show policy evaluation counts grouped by verdict and policy type.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--period` | string | no | Time window: 24h | 7d | 30d (default 24h) |

<!-- AUTO-GEN-END -->
