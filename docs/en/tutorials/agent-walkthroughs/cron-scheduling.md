---
title: CRON Scheduling
description: Step-by-step guide to scheduling workflow runs on a recurring CRON expression — enabling the feature flag, creating schedules, configuring policies, monitoring health, and handling missed runs.
---

# CRON Scheduling

CRON scheduling lets your workflows run automatically on a timed interval. A pg_cron job fires on each tick, creates a new workflow run, and assigns it to the agent or team you configured — all without you triggering it manually.

This tutorial covers enabling the feature, creating your first schedule, configuring the four policy bundles, and monitoring schedule health.

**Prerequisites:**
- At least 1 workflow ready to schedule
- An agent or team to run it (see [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent) or [Manage Agent Teams](/en/tutorials/agent-walkthroughs/manage-agent-teams))

---

## Step 1 — Enable CRON scheduling

CRON scheduling is **off by default** in Community Edition and requires `pg_cron` in your Supabase project.

**Enable it:**

```bash
# In your .env or .env.local at the project root
Supabase `pg_cron` configured for workflow dispatch
```

This flag enables the **Schedules** section in the Automation workspace and the CRON dispatch UI.

To confirm pg_cron is available in your local Supabase:

```bash
pnpm supabase status
# Should show pg_cron in the extensions list

# Or query directly:
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'pg_cron';"
```

If pg_cron is not listed, enable it in `supabase/config.toml`:

```toml
[db.extensions]
pg_cron = true
```

Then restart Supabase:

```bash
pnpm supabase stop && pnpm supabase start
```

---

## Step 2 — Understand the CRON expression

LenserFight uses standard 5-field cron syntax. All times are evaluated in the timezone you specify (default: `UTC`).

```
┌───── minute (0–59)
│ ┌───── hour (0–23)
│ │ ┌───── day of month (1–31)
│ │ │ ┌───── month (1–12)
│ │ │ │ ┌───── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Common patterns for workflow scheduling:

| Expression | Fires |
|-----------|-------|
| `0 9 * * 1-5` | Weekdays at 09:00 |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of the month |
| `*/30 * * * *` | Every 30 minutes |
| `0 9,18 * * *` | At 09:00 and 18:00 daily |

---

## Step 3 — Create your first schedule

```bash
lf schedule create \
  --workflow <workflow-slug> \
  --cron "0 9 * * 1-5" \
  --timezone "Europe/Istanbul" \
  --name "Morning digest" \
  --assignee-type agent \
  --assignee-id <lenser-id>
```

To assign to a team instead of a single agent:

```bash
lf schedule create \
  --workflow <workflow-slug> \
  --cron "0 9 * * 1-5" \
  --timezone "Europe/Istanbul" \
  --name "Morning digest (team)" \
  --assignee-type team \
  --assignee-id <team-id>
```

The schedule is **active immediately** after creation. To create it paused:

```bash
lf schedule create \
  --workflow <workflow-slug> \
  --cron "0 9 * * *" \
  --name "Digest (paused)" \
  --enabled false
```

---

## Step 4 — Provide default inputs

Most workflows need root inputs — the starting data for the pipeline. For a scheduled run, you set these as an `inputs_template` at schedule creation:

```bash
lf schedule create \
  --workflow daily-digest \
  --cron "0 9 * * 1-5" \
  --input topic="AI news" \
  --input audience="tech community" \
  --input tone="conversational"
```

These inputs are passed to every run the schedule creates. You can override them by running the workflow manually with different inputs.

---

## Step 5 — Configure the policy bundle

Each schedule carries four policy bundles that govern every run it creates. The CLI accepts them as JSON:

```bash
lf schedule create \
  --workflow daily-digest \
  --cron "0 9 * * 1-5" \
  --approval-policy '{"requiresApproval": true, "mode": "sensitive_actions"}' \
  --retry-policy '{"maxRetries": 2, "backoffMs": 1000, "retryOn": ["timeout", "provider_error"]}' \
  --failure-policy '{"mode": "isolate"}' \
  --queue-policy '{"mode": "serial", "maxConcurrency": 1}'
```

### The critical rule: CRON cannot bypass approvals

If `approval_policy.requiresApproval` is `true`, every scheduled run creates an `approval_status='pending'` row. The engine does **not** start executing nodes until you approve it — even though the trigger was automatic.

This is non-negotiable and mechanically enforced. A schedule cannot grant itself permissions its owner has not explicitly approved.

```bash
# Approve a scheduled run
lf approval list
lf approval approve <approval-id>
```

---

## Step 6 — List and inspect schedules

```bash
# List all your schedules
lf schedule list

# View details of a specific schedule
lf schedule show <schedule-id>
```

The `show` output includes:
- CRON expression and timezone
- Assignee (agent or team)
- Policy bundle (approval, retry, failure, queue)
- `last_dispatch_status` — `dispatched`, `skipped_overlap`, `paused`, `dispatch_failed`
- `last_run_at` and `last_completed_at`
- `next_run_at`

---

## Step 7 — Pause, resume, and update

```bash
# Pause a schedule (stops future runs without deleting)
lf schedule pause <schedule-id>

# Resume a paused schedule
lf schedule resume <schedule-id>

# Change the CRON expression or timezone
lf schedule update <schedule-id> \
  --cron "0 10 * * 1-5" \
  --timezone "America/New_York"

# Change the inputs template
lf schedule update <schedule-id> \
  --input topic="Business news" \
  --input tone="formal"

# Delete a schedule (does not delete the workflow or its runs)
lf schedule delete <schedule-id>
```

> Pausing and resuming a schedule is itself a sensitive action. If your team's approval policy includes the `modify_schedule` gate, the pause/resume will land in the approval queue first.

---

## Step 8 — Monitor schedule health

The `lf schedule health` command checks all your active schedules for missed dispatch windows:

```bash
lf schedule health
```

Output:
```
Schedule               Status    Last run        Next run         
morning-digest         OK        2026-05-04 09:00 2026-05-05 09:00
nightly-sweep          MISSED    2026-05-02 00:00 2026-05-03 00:00
weekly-report          PAUSED    —               —
```

Exit codes:
- **0** — all active schedules are healthy or paused
- **1** — at least one schedule is MISSED

This makes `lf schedule health` suitable for CI and cron-monitoring integrations:

```bash
# In a CI step or monitoring script
lf schedule health || alert "LenserFight schedule missed!"
```

### How MISSED is detected

A schedule is flagged MISSED when either:
- `last_run_at + 2 × expected_interval < now`, or
- `next_run_at` is more than one interval in the past

The expected interval is inferred from the CRON expression (e.g. `0 * * * *` → 60 minutes).

---

## Step 9 — View schedule history

```bash
lf schedule history <schedule-id>
```

Shows the most recent dispatches with:
- Dispatch time and status (`dispatched` / `skipped_overlap` / `validation_failed`)
- Run ID for each dispatched run
- Approval status if applicable

For the full run history with node results:

```bash
lf run list --workflow <workflow-slug> --trigger scheduled
```

---

## Step 10 — Handle missed runs

By default, if a run window is missed (downtime, paused engine), the next tick fires as normal — missed slots are **not** backfilled. You can change this behavior:

```bash
lf schedule update <schedule-id> \
  --queue-policy '{"mode": "serial", "onMissed": "run_once"}'
```

| `onMissed` | Behavior |
|-----------|---------|
| `skip` (default) | Drop missed slots; resume at next future tick |
| `run_once` | Dispatch one run on next tick to cover the missed window |
| `backfill` | Dispatch one run per missed slot (up to `maxBackfill`) |

> Use `backfill` carefully — if your service was down for several hours, this could create many simultaneous runs.

---

## What you learned

- How to enable pg_cron scheduling in Community Edition
- How to create, configure, and manage CRON schedules
- The four policy bundles and why approvals cannot be bypassed by CRON
- How to monitor schedule health and detect missed runs
- Missed-run policies and when to use each

---

## Next steps

- [Automation Rules](/en/tutorials/agent-walkthroughs/automation-rules) — Trigger workflows from platform events, not just time
- [Manage Agent Teams](/en/tutorials/agent-walkthroughs/manage-agent-teams) — Assign teams to scheduled workflows
- [Scheduling (ConnectedLenses spec)](/en/reference/internals/scheduling) — Full technical specification
- [Approvals](/en/reference/internals/approvals) — Approval gate mechanics
