---
title: Approval Commands
description: CLI reference for the approval queue — list pending entries, approve, reject, or modify-and-approve agent run requests.
---

# `lf approval`

Resolve approval gates that block autonomous agent runs. The queue is a projection of `agents.team_runs` with `approval_status='pending'`, materialized as `agents.approval_requests_v`.

For the full data model, see [Approvals](/reference/internals/approvals).

## `lf approval list`

List approval queue entries for an AI workspace.

```bash
lf approval list --ai-lenser <ai-lenser-id>
lf approval list --ai-lenser <id> --status pending
lf approval list --ai-lenser <id> --json
```

| Flag | Description |
|---|---|
| `--ai-lenser <id>` | AI workspace whose queue to view. |
| `--status <state>` | Filter to `pending`, `approved`, `rejected`, `not_required`, or `timed_out`. |
| `--json` | Output as JSON. |

::: tip Auto-timeout
Pending approvals older than `app.approval_timeout_hours` (default 24) are auto-expired by the `expire-stale-approvals` pg_cron job to `approval_status='timed_out'`. See [Timeout behavior](/reference/internals/approvals#timeout-behavior).
:::

## `lf approval approve`

Approve a pending request. The engine resumes the run on its next poll cycle.

```bash
lf approval approve <approval-id>
lf approval approve <approval-id> --reason "Looks good"
lf approval approve <approval-id> \
  --modifications '{"inputs":{"topic":"revised topic"}}'
```

| Flag | Description |
|---|---|
| `--reason <text>` | Free-text rationale recorded in `metadata.decision_reason`. |
| `--modifications <json>` | Modify-and-approve. JSON object merged into the run's input payload. |

## `lf approval reject`

Reject a pending request. The run terminates with `status='failed'`.

```bash
lf approval reject <approval-id>
lf approval reject <approval-id> --reason "Holiday — skip today"
```

| Flag | Description |
|---|---|
| `--reason <text>` | Free-text rationale recorded in `metadata.decision_reason`. |

## Standing approvals

A standing approval pre-authorises a workflow + gate kind for a bounded time window so the agent runs without producing per-run approval requests. Backed by `agents.standing_approvals`.

### `lf approval grant-standing`

```bash
lf approval grant-standing --workflow <id> --gate <kind>
lf approval grant-standing --workflow <id> --gate spending --hours 12
```

| Flag | Description |
|---|---|
| `--workflow <id>` | Required. Workflow UUID. |
| `--gate <kind>` | Required. Gate kind to pre-authorise (e.g. `tool`, `spending`, `model`). |
| `--hours <n>` | Validity window in hours. Default `24`. |

Prints the new standing approval UUID on success.

### `lf approval revoke-standing`

```bash
lf approval revoke-standing <standing-id>
```

Revokes immediately — subsequent runs hitting the same gate will produce normal pending approvals.

### `lf approval list-standing`

```bash
lf approval list-standing
lf approval list-standing --workflow <id>
lf approval list-standing --json
```

| Flag | Description |
|---|---|
| `--workflow <id>` | Filter to a single workflow UUID. |
| `--json` | Output as JSON. |

Lists active (non-revoked) standing approvals. Output columns: `ID | Workflow | Gate | Granted At | Expires At`.

## `lf approval bulk-approve`

Approve a filtered set of pending approvals in a single round-trip. The CLI calls `agents.fn_bulk_approve(p_filters jsonb)` and prints the count returned by the RPC.

```bash
# Approve every pending request — with confirmation prompt
lf approval bulk-approve

# Restrict to one workflow and the last hour
lf approval bulk-approve --workflow <workflow-id> --since 1h

# Skip the confirmation prompt (useful for scripts)
lf approval bulk-approve --workflow <id> --since 30m --force
```

| Flag | Description |
|---|---|
| `--filter <key=value>` | `key=value` filter forwarded into the RPC. Default `status=pending`. |
| `--since <iso\|shorthand>` | Only approve requests created since this time. ISO 8601 or shorthand (`1h`, `30m`, `2d`). |
| `--workflow <id>` | Restrict to a single workflow UUID. |
| `--force` | Skip the `[y/N]` confirmation prompt. |

Before running the RPC, the CLI does a best-effort PostgREST count to preview how many runs would be approved (`About to approve N pending runs`). Confirmation is required unless `--force` is passed.

::: warning RPC dependency
`bulk-approve` depends on the SQL function `agents.fn_bulk_approve(p_filters jsonb) RETURNS int`, which ships in the Phase Y Supabase migration. Until that migration is applied to the target backend, the command surfaces a clean PostgREST "function not found" error and exits non-zero. The CLI is wired now so it works the moment the function exists.
:::

## Webhook (preview)

Setting `app.approval_webhook_url` causes every newly-created pending approval to fire a best-effort POST with payload version `1`. See [Pending-approval webhook](/reference/internals/approvals#pending-approval-webhook) for the payload contract and delivery semantics.
