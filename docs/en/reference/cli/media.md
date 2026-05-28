---
title: lf media
description: Inspect and download media artifacts (images, audio, video) produced by workflow runs.
---

# `lf media`

Inspect, download, and manage media artifacts produced by workflow runs. Reads go through PostgREST against the `media` schema, so RLS enforces ownership — you only see media you own.

```bash
lf media list           [--run <run-id>] [--limit N] [--json]
lf media info           --id <media-id> [--json]
lf media download       --id <media-id> [--out <path>]
lf media play           --id <media-id>
lf media manifest       --run <run-id> [--json]
lf media set-visibility --id <media-id> --visibility <public|private|unlisted>
lf media delete         --id <media-id> [--force]
lf media cleanup        --before <ISO-8601> [--dry-run] [--force]
```

---

## `lf media list`

List media objects produced by workflow runs you own.

| Flag | Description |
|------|-------------|
| `--run <run-id>` | Filter by `execution.runs.id` (joined via `media.objects.request_id`) |
| `--limit N` | Max rows (default 25, max 200) |
| `--json` | Raw JSON |

```bash
lf media list --run 6c2e…f01a --limit 50
```

---

## `lf media info`

Show full metadata for one media object: MIME, byte size, dimensions, duration, lifecycle state, visibility.

```bash
lf media info --id <media-id> --json
```

---

## `lf media download`

Download a media object to a local file, or stream the bytes to stdout when `--out` is omitted.

```bash
lf media download --id <media-id> --out ./hero.png
lf media download --id <media-id> > raw.bin     # pipe-friendly
```

---

## `lf media play`

Open a media object in the system default browser or player (`open` on macOS, `xdg-open` on Linux, `start` on Windows). Best for quick visual inspection of one item without leaving the terminal.

```bash
lf media play --id <media-id>
```

---

## `lf media manifest`

Show the **media manifest** for a workflow run — every artifact produced by every step, in execution order.

```bash
lf media manifest --run <run-id> --json
```

---

## `lf media set-visibility`

Change the visibility of a media object.

| Flag | Description |
|------|-------------|
| `--id <media-id>` | required |
| `--visibility <public\|private\|unlisted>` | required |

```bash
lf media set-visibility --id <media-id> --visibility unlisted
```

---

## `lf media delete`

Soft-delete a media object — sets `lifecycle_state = deleted`. Object bytes are reclaimed by the background `media-cleanup` cron, not immediately.

| Flag | Description |
|------|-------------|
| `--id <media-id>` | required |
| `--force` | Skip the typed-`yes` confirmation |

---

## `lf media cleanup`

Find and (optionally) delete **orphaned pending uploads** — `media.objects` rows that never transitioned to `ready`. Used for housekeeping after failed uploads.

| Flag | Description |
|------|-------------|
| `--before <ISO-8601>` | Match uploads created before this date |
| `--dry-run` | Print matches without deleting (default) |
| `--force` | Required to actually delete |

```bash
lf media cleanup --before 2026-04-01T00:00:00Z          # dry-run by default
lf media cleanup --before 2026-04-01T00:00:00Z --force  # actually delete
```

---

## Common mistakes

- **Trying to view another user's media.** RLS hides it — you will see "not found," not "permission denied."
- **Expecting hard delete from `delete`.** Bytes are reclaimed asynchronously; the row is soft-deleted immediately but the storage object lingers until the cleanup cron runs.
- **Mixing `--run` (execution.runs.id) with `lens_runs.id`.** The `--run` filter joins on `request_id`, which points at `execution.runs`, not `lenses.workflow_runs`.

---

## Related

- [`lf execution`](execution.md) — find run IDs to pass to `--run`
- [`lf publish`](publish.md) — promote media artifacts into a publishable surface
- [Media schema](/en/reference/database/schema-media)
- [Storage adapters](/en/reference/platform-api/storage-adapters)
