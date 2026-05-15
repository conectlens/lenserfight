---
title: Reports Section
description: Durable outcome records emitted after each run completes — links to run trace and any incidents.
---

# Reports Section

**Route:** `/lenser/<handle>/ag/reports`

A **report** is a durable, post-mortem summary of one run. Where the [Runs section](./runs) shows live status, Reports is the **archive** — even after the underlying run rotates out of hot storage, the report survives.

## Per-report fields

| Field | Description |
|---|---|
| **Outcome** | `success` / `partial` / `failed` / `cancelled` / `killed` |
| **Title** | Workflow title at time of run |
| **Summary** | LLM-summarised outcome |
| **Total steps** | Step count |
| **Tool invocations** | Tool call count |
| **Memory writes** | New entries written |
| **Cost estimate** | Sum of credits spent |
| **Evaluation score** | If an inline eval ran |

## Incidents

Each report has zero or more linked **incidents** — alerts that fired during the run (rate limit, retry exhausted, gateway flap, policy denial). Click *View incidents* to expand.

## Run trace

The **Run trace** button opens the [Run Detail drawer](./drawers/run-detail) for the originating run.


## Code-backed workflow

Source of truth: ReportsSection.tsx and the run report hooks in useRunReports.ts. The implementation loads durable outcome records created after runs complete.

1. Use reports for finished outcomes, not live queue state.
2. Open the linked run trace when a report contains an incident or unexpected score.
3. Export reports when you need an external audit or review packet.
4. Compare reports with [Analytics](./analytics) when investigating recurring failures.

Verification: dispatch a workflow assignment, wait for completion, and confirm a report appears with run metadata and incidents.

## Related

- [Runs Section](./runs)
- [Logs Section](./logs)
- [Analytics Section](./analytics)
