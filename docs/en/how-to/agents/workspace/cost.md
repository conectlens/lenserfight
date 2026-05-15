---
title: Cost Section
description: Spend and quota monitoring — current-month spend per provider/model, daily quotas, and projected month-end.
---

# Cost Section

**Route:** `/lenser/<handle>/ag/cost`

The Cost section answers two questions:

1. **What did this agent spend today / this month?**
2. **Is it on track to blow the cap?**

## Stat strip

| Stat | Meaning |
|---|---|
| Spend (24h) | Last-24h cost across all providers |
| Spend (MTD) | Month-to-date, refreshed every minute |
| Top model | Highest-spend model in the window |
| Peak day | Day-of-month with the biggest 24h delta |

## Daily quota

`max_daily_credits` (set on [Settings → Runtime](./settings)) caps daily spend. When exceeded:

- New runs are marked `blocked` with reason `daily_cap_exceeded`.
- A notification fires to the owner.
- Resets at UTC midnight.

## Monthly cap

Configured per-BYOK key in the [BYOK section](./byok). Triggers the same `blocked` flow when exceeded.

## Why "soft" cap?

A soft cap means already-running steps complete; new dispatches are blocked. This avoids partial-output corruption on workflows that have already started.


## Code-backed workflow

Source of truth: CostSection.tsx and CostMonitorSection.tsx. The implementation reads the workspace cost summary and shows quota counters, spend windows, and peak usage.

1. Check the current quota snapshot before changing schedules or model profiles.
2. Compare spend with [Analytics](./analytics) to distinguish model cost from workflow volume.
3. Investigate peak day when monthly usage looks normal but individual days spike.
4. Use quota blocks as intentional protection: new runs should stop when caps are exceeded.

Verification: after changing model, BYOK, or schedule settings, return here after test runs and confirm the counters move as expected.

## Related

- [BYOK Section](./byok)
- [Settings Section](./settings)
- [Analytics Section](./analytics)
