---
title: Agent Team Scheduled Workflow with Gated Tool
description: Advanced tutorial — create an agent team, assign a workflow that includes a write-class tool, schedule it, and walk through the two-stage approval (run + tool invocation).
---

# Agent Team Scheduled Workflow with Gated Tool

::: warning Status: Preview
CRON scheduling and tool invocation gating both require a full Supabase instance. See [Known Preview Surfaces](/en/reference/known-preview-surfaces).
:::

This tutorial covers a more advanced automation pattern: an agent **team** runs a scheduled workflow that includes a **write-class tool**. Both the scheduled run and the tool call require separate owner approvals. Nothing happens without two explicit human decisions.

**Prerequisites:**

- [Daily Workflow with Approval](/en/tutorials/agent-walkthroughs/daily-workflow-with-approval) — understand single-agent scheduling first
- A workflow that includes at least one tool node with `egress_class: write`
- Two or more agents configured in your workspace

---

## Step 1 — Create an agent team

```bash
lf team create \
  --name "Content Team" \
  --autonomy autonomous_with_gates
```

`autonomous_with_gates` allows the team to initiate runs but keeps all write-class gates active. The team cannot self-approve tool calls.

Add agents to the team:

```bash
lf team add-member <team-id> --agent <agent-a-id> --role executor
lf team add-member <team-id> --agent <agent-b-id> --role reviewer
```

---

## Step 2 — Assign the workflow to the team

```bash
lf workflow assign <workflow-id> --team <team-id>
```

This creates an `agents.workflow_assignments` row linking the workflow to the team.

---

## Step 3 — Schedule the workflow with approval required

```bash
lf schedule create \
  --workflow <workflow-id> \
  --assignee-type team \
  --assignee <team-id> \
  --cron "0 9 * * 1-5" \
  --timezone UTC \
  --require-approval
```

This schedules the workflow on weekdays at 09:00 UTC, assigned to the team, with a run-level approval gate.

---

## Step 4 — Approve the scheduled run

At 09:00 UTC Monday–Friday, a pending team run appears:

```bash
lf approval list --type team_run
```

Approve it:

```bash
lf approval decide <run-approval-id> approve
```

The workflow engine begins executing. When it reaches the write-class tool node, execution **pauses again**.

---

## Step 5 — Approve the tool invocation

The write-class tool call creates a `agents.tool_invocations` row with `approval_status='pending'`. The run is blocked until you decide.

List pending tool approvals:

```bash
lf tool-invocations list --status pending
```

Inspect what the tool would do:

```bash
lf tool-invocations inspect <invocation-id>
```

This shows the tool name, egress class, input payload, and the agent that triggered it.

**Approve the tool call:**

```bash
lf tool-invocations approve <invocation-id>
```

The tool executes. The workflow node completes and the run continues to the next node.

**Reject the tool call:**

```bash
lf tool-invocations reject <invocation-id> --reason "Unexpected payload"
```

The tool node fails with `error_code='tool_invocation_rejected'`. The workflow's failure policy (`isolate` by default) prevents the failure from cascading to other nodes. The run completes with a partial result.

---

## Step 6 — Verify the audit trail

Each decision is recorded permanently:

```sql
-- Run-level approval decision
SELECT metadata->>'decision_by_lenser_id',
       metadata->>'decision_at',
       metadata->>'decision_reason'
FROM agents.agent_run_events
WHERE run_id = '<run-id>'
  AND event_type = 'approval_decided';

-- Tool invocation approval
SELECT approved_by, approved_at, rejection_reason, status
FROM platform.tool_invocation_logs
WHERE invocation_id = '<invocation-id>';
```

See [Audit Trail Examples](/en/tutorials/agent-walkthroughs/audit-trail-examples) for full query patterns.

---

## Why two gates?

| Gate | What it blocks | Who resolves it |
|------|----------------|-----------------|
| Run-level approval | The entire workflow run | Owner (human) |
| Tool invocation approval | A specific write-class tool call within the run | Owner (human) |

The two gates are independent. You can approve the run but reject a specific tool call if the payload looks wrong. The workflow continues to other nodes after the rejection.

**CRON cannot bypass either gate.** A schedule set to `requiresApproval: true` always produces a pending run, even if the team has `full_autonomy`. The tool invocation gate is enforced separately by `fn_invoke_tool()` regardless of schedule settings.

---

## Next steps

- [Audit Trail Examples](/en/tutorials/agent-walkthroughs/audit-trail-examples) — full SQL patterns for both gate types
- [Agent Boundaries](/en/explanation/agents/agent-boundaries) — what agents can and cannot do at each autonomy level
- [Approvals Reference](/en/reference/internals/approvals) — decision walkthrough with modify-and-approve
