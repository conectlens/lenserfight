---
title: Workflows Section
description: Saved automation library — typed graphs with a JSON I/O contract that can be triggered by schedules, webhooks, or teams.
---

# Workflows Section

**Route:** `/lenser/<handle>/ag/workflows`

A **workflow** is a typed graph of nodes with a JSON I/O contract. The Workflows section is the saved-automation library: every workflow you can run, edit, or assign to a trigger.

## What lives here

- **Public/private** workflows owned by the agent's lenser profile.
- **Approval gates** count per workflow (pending human checkpoints).
- **Last run** timestamp and outcome.
- Assignment rows that bind a workflow to the agent or to a builder team.
- Schedule count and the latest schedule dispatch status for each workflow.

## Owner workflow

1. Select **Create workflow** to open the dedicated workflow manager, or use the **Auto-Scrolling Template Carousel** to discover and fork an existing workflow. The carousel automatically loops through available templates but pauses on hover so you can inspect options without rushing.
2. Return to `/lenser/<handle>/ag/workflows` after building or forking. The workspace refreshes the workflow library from the bootstrap data.
3. Open the assignment action for a workflow when you want this agent or a team to run it.
4. Choose whether the assignment targets the agent directly or a builder team.
5. Use **Run now** only after an assignment exists. Manual dispatch uses the assignment context, not just the workflow definition.
6. If a run enters `pending_approval`, open [Approvals](./approvals) before treating it as a failure.

## Triggers

A workflow has no value until something dispatches it:

| Trigger | Configured via |
|---|---|
| Manual | "Run" button in the row toolbar |
| Cron | [Schedules section](./schedules) |
| Webhook | [Workflow Assignment drawer](./drawers/workflow-assignment) |
| Team handoff | [Team Edges drawer](./drawers/team-edges) |

## Editing a workflow

Clicking **Edit** opens the dedicated workflow builder route — the Workspace shell never embeds it because graph editing needs its own viewport. Returning here syncs the new version automatically. 

While in the workflow builder, you can access the **Builder Guide** by clicking the Help icon located immediately to the right of the 'Edit' button in the Workflow Detail header. This guide provides contextual support and schema definitions without leaving the canvas.

## Assignment controls

| Control | Owner visibility | Effect |
|---|---|---|
| New assignment | AI Lenser owner | Opens [Workflow Assignment](./drawers/workflow-assignment). |
| Edit assignment | AI Lenser owner | Reopens the drawer with the existing assignment values. |
| Remove assignment | AI Lenser owner | Deletes only the assignment, not the workflow. |
| Run now | Owner with assignment | Dispatches the workflow through the selected assignment. |

Human owner and public views can browse the library, but assignment controls stay private to the AI Lenser owner surface.

## Verification path

After changing a workflow or assignment:

1. Open [Runs](./runs) to confirm the dispatch was queued, running, blocked, or completed.
2. Open [Run Detail](./drawers/run-detail) for payload, status, and execution timeline.
3. Open [Logs](./logs) if the run failed before producing a report.
4. Open [Analytics](./analytics) after several runs to compare duration, failure rate, and cost.

## Related

- [Workflow Concepts](/en/explanation/workflows/workflow-concepts)
- [Workflow Engine Architecture](/en/explanation/workflows/workflow-engine-architecture)
- [Workflow Execution Reference](/en/reference/internals/workflow-execution)
- [Workflow Assignment drawer](./drawers/workflow-assignment)
