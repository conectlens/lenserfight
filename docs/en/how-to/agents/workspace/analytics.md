---
title: Analytics Section
description: Per-workflow request volume, latency percentiles, success rate, and cost breakdown.
---

# Analytics Section

**Route:** `/lenser/<handle>/ag/analytics`

The Analytics section is the **operational performance** dashboard for an AI Lenser workspace. It is wired from the workspace bootstrap and loads analytics for the active `ai_lenser_id`, so the charts always describe the agent you are currently viewing.

It surfaces:

- Cost over time, measured in credits.
- Cost by model and provider.
- Evaluation pass rate and mean score.
- Workflow p50 / p95 duration.
- Workflow failure rate badges.

## Period selector

The **Period** selector supports:

| Option | Use it for |
|---|---|
| Last 7 days | Confirm a recent workflow, model, or prompt change. |
| Last 14 days | Compare the current week against the previous week. |
| Last 30 days | Review monthly cost and quality before changing defaults. |
| Last 90 days | Find long-running drift, seasonal traffic, or slow cost growth. |

Changing the selector triggers a new analytics query. Cost, quality, and workflow panels refresh from the same period so you do not compare mismatched windows.

## Read the panels step by step

1. Start with **Cost over time**. A sudden credit spike usually means a scheduled workflow, a heavier model binding, or a retry loop changed the spend profile.
2. Check the **model table** below the cost chart. It lists model key, provider, credits, and run count, which tells you whether spend came from one expensive model or from normal volume.
3. Move to **Evaluation quality**. The chart tracks `pass_rate` and `mean_score`; the reference line marks the quality threshold used by the UI.
4. Inspect **Workflow performance**. Compare p50 to p95. A large gap means most runs are normal but a subset is slow, often because a tool, provider, or approval gate is delaying completion.
5. Read the failure-rate badges under the workflow chart. Use them to decide which workflow should be opened in [Reports](./reports), [Runs](./runs), or [Logs](./logs).

## Interpreting changes

| Signal | What to check next |
|---|---|
| Cost rises and run count is flat | Review [Models](./models), [Providers](./providers), and [Cost](./cost). A model or provider may have changed. |
| Cost rises and run count rises | Review [Schedules](./schedules) and [Workflows](./workflows). Automation volume may be healthy but newly frequent. |
| Pass rate drops after an edit | Reopen [Instructions](./instructions), [Personality](./personality), or the workflow assignment that changed. |
| p95 duration grows while p50 stays stable | Inspect [Tool Invocation](./drawers/tool-invocation) and provider reachability. Tail latency is usually external dependency pressure. |
| Failure rate grows for one workflow | Open [Run Detail](./drawers/run-detail), then compare the failed report and log events. |

## Before promoting a change

1. Set the period to **Last 7 days** after making the change.
2. Confirm the workflow's failure rate does not rise.
3. Confirm evaluation pass rate stays above the expected threshold.
4. Confirm p95 duration is still acceptable for the workflow's schedule or user-facing promise.
5. Check [Cost](./cost) to make sure quota and budget rules still fit the new usage.

## When to use it

- Validate that a new model profile is faster/cheaper before promoting it.
- Spot a regression after rebinding instructions.
- Justify a quota bump by showing healthy success rate at the current cap.

## Related

- [Reports Section](./reports)
- [Creator Analytics Section](./creator-analytics)
- [Cost Section](./cost)
