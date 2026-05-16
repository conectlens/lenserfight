---
title: Daily Workflow with Approval
description: Step-by-step guide to scheduling a daily workflow that requires owner approval before it runs — the safest entry point to LenserFight automation.
---

# Daily Workflow with Approval

::: warning Status: Preview
CRON scheduling requires a full Supabase instance and Supabase `pg_cron` configured for workflow dispatch. See [Known Preview Surfaces](/en/reference/known-preview-surfaces).
:::

This tutorial sets up a workflow that runs every morning at 08:00 but **waits for your explicit approval before executing**. Nothing runs unattended. You remain in control of every invocation.

This is the recommended starting point for anyone new to LenserFight automation.

**Prerequisites:**

- A workflow already created and tested manually (see [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow))
- An agent assigned to that workflow (see [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent))
- CRON scheduling enabled (see [CRON Scheduling](/en/tutorials/agent-walkthroughs/cron-scheduling))

---

## Step 1 — Create the schedule with approval required

```bash
lf schedule create \
  --workflow <workflow-id> \
  --cron "0 8 * * *" \
  --timezone Europe/Istanbul \
  --require-approval
```

This creates a row in `lenses.workflow_schedules` with:

```json
{
  "approval_policy": { "requiresApproval": true },
  "cron_expr": "0 8 * * *",
  "timezone": "Europe/Istanbul",
  "is_active": true
}
```

Confirm it was created:

```bash
lf schedule list
```

Expected output:

```
ID          WORKFLOW           CRON         TIMEZONE          APPROVAL   ACTIVE
<uuid>      My Daily Summary   0 8 * * *    Europe/Istanbul   required   yes
```

---

## Step 2 — Wait for the first dispatch

At 08:00 Istanbul time, `pg_cron` fires `fn_dispatch_scheduled_workflows_with_approval()`. Because `requiresApproval` is `true`, the dispatch creates a `team_run` with `approval_status='pending'` and stops. **The workflow does not run yet.**

You will see the pending run in the Approvals tab of your agent workspace, or via CLI:

```bash
lf approval list
```

Expected output:

```
ID          AGENT              WORKFLOW           CREATED AT
<uuid>      my-agent           My Daily Summary   2026-05-09 08:00:01 UTC
```

---

## Step 3 — Review and approve

Inspect what the run would do:

```bash
lf approval inspect <approval-id>
```

This shows the workflow graph, the resolved inputs, and the assigned agent.

Approve when ready:

```bash
lf approval decide <approval-id> approve
```

The run is immediately claimed by the execution engine. Track it:

```bash
lf run inspect <run-id>
```

Expected output:

```
STATUS      STARTED AT                 COMPLETED AT
completed   2026-05-09 08:00:45 UTC    2026-05-09 08:01:12 UTC
```

---

## Step 4 — Reject or modify inputs (optional)

**Reject** if the run should not proceed:

```bash
lf approval decide <approval-id> reject --reason "Holiday — skip today"
```

The `team_run` moves to `status='failed'` with the rejection reason recorded in `metadata.decision_reason`.

**Modify inputs and approve** to adjust what the workflow receives before it runs:

```bash
lf approval decide <approval-id> approve \
  --modifications '{"inputs": {"topic": "revised topic for today"}}'
```

The run executes with the overridden inputs instead of the original schedule inputs.

---

## Step 5 — Pause and resume

If you want to suspend the schedule temporarily:

```bash
lf schedule pause <schedule-id>
```

Resume later:

```bash
lf schedule resume <schedule-id>
```

Paused schedules set `is_active=false`. The dispatch function skips them and records `last_dispatch_status='paused'`.

---

## What this setup guarantees

- The workflow **never runs unattended**. Every dispatch requires a human decision.
- CRON cannot bypass the approval gate. This is a non-negotiable platform invariant.
- If you miss the approval window, the run stays `pending` until you decide. It does not auto-expire or auto-run.
- You can delete the schedule at any time: `lf schedule delete <schedule-id>`

---

## Next steps

- [Agent Team + Gated Tool Schedule](/en/tutorials/agent-walkthroughs/agent-team-scheduled-gated-tool) — add a write-class tool with its own approval gate
- [Audit Trail Examples](/en/tutorials/agent-walkthroughs/audit-trail-examples) — inspect the approval decision audit record
- [Scheduling Reference](/en/reference/internals/scheduling) — full policy bundle documentation
