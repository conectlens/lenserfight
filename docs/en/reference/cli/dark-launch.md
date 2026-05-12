---
title: lf dark-launch
description: Manage dark launch settings for an agent.
---

<!-- AUTO-GEN-START -->

# `lf dark-launch`

Manage dark launch settings for an agent.

## `lf dark-launch enable`

Enable dark launch for an agent with a given traffic percentage.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--pct` | string | yes | Traffic percentage to dark-launch (0-100) |

## `lf dark-launch disable`

Disable dark launch for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |

## `lf dark-launch status`

Show dark launch settings for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |

<!-- AUTO-GEN-END -->
