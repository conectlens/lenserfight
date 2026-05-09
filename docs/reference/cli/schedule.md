---
title: Schedule Commands
description: CLI reference for managing workflow CRON schedules — create, pause, resume, delete, history, and health.
---

# `lf schedule`

Manage CRON schedules for workflows. Schedules dispatch through pg_cron and respect approval policies, spending limits, and the platform autonomy kill switch.

## `lf schedule list`

List workflow schedules visible to the active workspace.

```bash
lf schedule list
lf schedule list --workflow <workflow-id>
lf schedule list --json
```

| Flag | Description |
|---|---|
| `--workflow <id>` | Filter to a single workflow UUID. |
| `--json` | Output as JSON. |

## `lf schedule create`

Create or upsert a CRON schedule for a workflow.

```bash
lf schedule create \
  --workflow <workflow-id> \
  --cron "0 9 * * MON" \
  --timezone "Europe/Istanbul" \
  --description "Weekly Monday digest"
```

| Flag | Description |
|---|---|
| `--workflow <id>` | Required. Workflow UUID. |
| `--cron <expr>` | Required. 5-field CRON expression. |
| `--timezone <tz>` | IANA timezone name. Default `UTC`. |
| `--approval <json>` | Approval policy override, e.g. `'{"requiresApproval":false}'`. |
| `--retry <json>` | Retry policy override. |
| `--failure <json>` | Failure policy override. |
| `--queue <json>` | Queue policy override. |
| `--inputs <json>` | Default `inputs` for each dispatch. |
| `--global-model <key>` | Force a global model id. |
| `--assignee <id>` | Assignee lenser id. |

::: warning Approval gate
Activating with `requiresApproval=false` is rejected (Postgres `ERRCODE 23514`) when the agent has no `policies.spending_limit_credits`. Set a spending limit first, or leave approval enabled.
:::

## `lf schedule pause` / `lf schedule resume`

Toggle `is_active` without losing the schedule.

```bash
lf schedule pause <schedule-id>
lf schedule resume <schedule-id>
```

## `lf schedule delete`

Delete a schedule permanently.

```bash
lf schedule delete <schedule-id>
```

## `lf schedule history`

Show the most recent runs dispatched by a schedule, joined from `lenses.workflow_runs`. Replaces the prior single-row last-dispatch view (Phase K3).

```bash
lf schedule history <schedule-id>
lf schedule history <schedule-id> --limit 25
lf schedule history <schedule-id> --json
```

| Flag | Description |
|---|---|
| `--limit <n>` | Max rows. 1–50, default 10. |
| `--json` | Output as JSON. |

Output columns: `Run ID | Started | Completed | Status | Duration (ms)`.

## `lf schedule health`

Detect schedules that have missed their expected dispatch window. Exits 1 when any active schedule is `MISSED`.

```bash
lf schedule health
lf schedule health --json
```

Statuses: `OK`, `MISSED`, `PAUSED`, `NEVER_RAN`. The interval is inferred from the CRON expression (`*/5 * * * *` → 5 min, `0 * * * *` → 60 min, etc.).

## `lf schedule backfill`

Replay missed dispatches between `--since` and now. Use `--dry-run` to preview the ticks without enqueuing runs.

```bash
lf schedule backfill <schedule-id> --since 2026-05-01T00:00:00Z --dry-run
lf schedule backfill <schedule-id> --since 2026-05-01T00:00:00Z
lf schedule backfill <schedule-id> --since 2026-05-01T00:00:00Z --json
```

| Flag | Description |
|---|---|
| `<schedule-id>` | Required. Schedule UUID. |
| `--since <iso>` | Required. Lower-bound ISO 8601 timestamp. |
| `--dry-run` | Preview dispatches without enqueuing runs. |
| `--json` | Output the raw RPC result. |

In dry-run mode the CLI prints `Would dispatch N run(s)` followed by a table of ticks (`fire_at`, `status`). Without `--dry-run` it prints `Dispatched N run(s) (skipped M already-backfilled)` — duplicates are de-duped against existing runs, so the command is idempotent.

## CRON v2 (calendars / conditions / rotation / preview)

Phase W layers calendar overlays, conditional dispatch, and parameter rotation on top of the base scheduler. See [Scheduling v2](/explanation/automation/scheduling-v2) for concept docs.

### `lf schedule calendar`

Manage `lenses.schedule_calendars` rows. Seed calendars (`us-federal-holidays-2026`, `tr-public-holidays-2026`, `weekends-only`) are read-only and cannot be modified or deleted.

```bash
lf schedule calendar create --name "team-blackout" --kind skip_dates --timezone "Europe/Istanbul" --dates 2026-12-24,2026-12-31
lf schedule calendar list
lf schedule calendar attach <schedule-id> --calendar <calendar-id>
lf schedule calendar detach <schedule-id>
```

| Subcommand | Flag | Purpose |
|---|---|---|
| `create` | `--name <text>`, `--kind skip_dates\|only_dates`, `--timezone <iana>`, `--dates <YYYY-MM-DD,...>` | Create a calendar owned by the active workspace. |
| `list` | `--seeds-only`, `--json` | List visible calendars (own + seeds). |
| `attach` | `<schedule-id> --calendar <id>` | Bind a calendar to a schedule. |
| `detach` | `<schedule-id>` | Clear `calendar_id` on the schedule (calendar row is preserved). |

### `lf schedule condition`

Set or clear the `pre_dispatch_condition` JSONB on a schedule. The DSL matches Phase U trigger rules (`eq|neq|gt|lt|contains` over JSON-Pointer paths against `{prior_run_result, last_24h_stats, signal_rpc_result}`).

```bash
lf schedule condition set <schedule-id> --filter '{"/last_24h_stats/failed":{"lt":3}}'
lf schedule condition clear <schedule-id>
```

| Subcommand | Flag | Purpose |
|---|---|---|
| `set` | `--filter <json>` | Replace the schedule's pre-dispatch filter. |
| `clear` | — | Set `pre_dispatch_condition = NULL`. |

### `lf schedule rotation`

Configure round-robin input templates. Index advances after each successful dispatch and wraps at array length.

```bash
lf schedule rotation set <schedule-id> --inputs '[{"tone":"punchy"},{"tone":"measured"}]'
lf schedule rotation clear <schedule-id>
```

| Subcommand | Flag | Purpose |
|---|---|---|
| `set` | `--inputs <json-array>` | Replace `inputs_rotation` and reset `last_rotation_index` to 0. |
| `clear` | — | Clear the rotation array and the index counter. |

### `lf schedule preview`

Dry-run the next N ticks. Calls `lenses.fn_preview_schedule_ticks` and prints per-tick `decision` (`dispatch` / `skip`) with the matching `reason` and the inputs the dispatcher would use.

```bash
lf schedule preview <schedule-id>
lf schedule preview <schedule-id> --next 25 --json
```

| Flag | Description |
|---|---|
| `--next <n>` | Number of ticks to preview. 1–200, default 10. Bounded by a 31-day forward window. |
| `--json` | Output rows as JSON. |

Output columns: `Tick At | Decision | Reason | Inputs`. The preview is read-only — it does not advance `last_rotation_index` and does not write to `agents.action_logs`.

<!-- AUTO-GEN-START -->

# `lf schedule`

Manage CRON schedules for ConnectedLenses workflows.

## `lf schedule create`

Create a calendar overlay (skip_dates or only_dates).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--name` | string | yes | Display name |
| `--kind` | string | yes |  |
| `--dates` | string | yes | Comma-separated ISO dates (YYYY-MM-DD) |
| `--timezone` | string | yes | IANA timezone (e.g. Europe/Istanbul) |

## `lf schedule list`

List calendar overlays (your own + platform seeds).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--seeds-only` | boolean | no | Show only platform seed calendars |
| `--mine-only` | boolean | no | Show only calendars you own |
| `--json` | boolean | no | Output as JSON |

## `lf schedule attach`

Attach a calendar overlay to a schedule.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<schedule>` | positional | yes | Schedule UUID |
| `<calendar>` | positional | yes | Calendar UUID |

## `lf schedule detach`

Detach the calendar overlay from a schedule.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<schedule>` | positional | yes | Schedule UUID |

<!-- AUTO-GEN-END -->
