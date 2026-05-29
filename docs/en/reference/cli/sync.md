---
title: lf sync
description: Sync file-workspace markdown objects with Supabase local (not Cloud). Requires lf use local.
---

<!-- AUTO-GEN-START -->

# `lf sync`

Sync file-workspace markdown objects with Supabase local (not Cloud). Requires lf use local.

## `lf sync status`

Show file-workspace registry entries ready to sync with Supabase local.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no |  |

## `lf sync plan`

Dry-run: show what lf sync push would apply to Supabase local.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no |  |

## `lf sync push`

Push file-workspace registry objects to Supabase local (requires lf use local).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--kind` | string | no | Filter: lens | lenser | colens |
| `--id` | string | no | Registry object id |
| `--path` | string | no | Import and push a single markdown file |
| `--all` | boolean | no | Push all registry entries |
| `--json` | boolean | no |  |

## `lf sync pull`

Export a registry object from disk snapshot to .lenserfight/ (refresh files).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--kind` | string | yes | lens | lenser | colens |
| `--id` | string | yes | Registry object id |
| `--json` | boolean | no |  |

<!-- AUTO-GEN-END -->
