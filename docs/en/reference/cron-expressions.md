---
title: CRON Expressions
description: Field-level reference for the 5-field CRON expression accepted by LenserFight workflow schedules. Includes syntax, examples, validation rules, timezone handling, and links to upstream sources.
---

# CRON Expressions

LenserFight workflow schedules accept the **standard POSIX 5-field CRON expression** (the same one used by `cron(8)`, GitHub Actions, and `pg_cron`). This page is a focused reference you can open from any schedule form — for the end-to-end walkthrough, see the [CRON Scheduling tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling).

---

## What CRON is

CRON is a tiny domain-specific language for describing **recurring points in time**. A CRON expression is a list of 5 fields, separated by spaces:

```
┌───── minute        (0–59)
│ ┌───── hour          (0–23)
│ │ ┌───── day of month (1–31)
│ │ │ ┌───── month        (1–12)
│ │ │ │ ┌───── day of week  (0–7, both 0 and 7 mean Sunday)
│ │ │ │ │
* * * * *
```

Each field accepts:

| Token       | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `*`         | every value                                            |
| `5`         | exact value                                            |
| `1,3,5`     | list of values                                         |
| `1-5`       | inclusive range                                        |
| `*/15`      | step (every 15 units, starting at the field's minimum) |
| `5-30/2`    | stepped range                                          |

LenserFight enforces exactly **5 fields**. Seconds and years are not supported.

---

## Common patterns

| Expression       | Fires                                |
| ---------------- | ------------------------------------ |
| `* * * * *`      | every minute                         |
| `*/5 * * * *`    | every 5 minutes                      |
| `0 * * * *`      | top of every hour                    |
| `0 9 * * *`      | every day at 09:00                   |
| `0 9 * * 1-5`    | weekdays at 09:00                    |
| `0 9,18 * * *`   | 09:00 and 18:00 every day            |
| `0 0 * * 0`      | every Sunday at midnight             |
| `0 0 1 * *`      | first day of every month at midnight |
| `15 14 1 * *`    | first day of every month at 14:15    |
| `*/30 9-17 * * 1-5` | every 30 min during business hours, weekdays |

---

## Timezone

Cron is **timezone-aware** in LenserFight. The `Timezone` field accepts any valid [IANA timezone identifier](https://www.iana.org/time-zones), e.g. `UTC`, `Europe/Istanbul`, `America/New_York`, `Asia/Tokyo`. The CRON expression is evaluated in that zone — including DST transitions.

If you leave the field blank, the schedule defaults to `UTC`.

---

## Validation rules

LenserFight rejects schedules where:

- the expression has fewer or more than 5 fields,
- a field uses unsupported tokens (e.g. `@hourly`, `L`, `?`, `#`),
- a field's numeric value is out of range (e.g. `60` in the minute field),
- the expression resolves to a frequency the platform forbids (e.g. faster than the minimum tick of the dispatcher).

The server-side check lives in [`fn_upsert_workflow_schedule`](/en/reference/database/rpc-reference) and raises `22023` for invalid expressions.

---

## How LenserFight runs your schedule

1. `pg_cron` ticks once per minute.
2. The dispatcher (`lenses.fn_dispatch_scheduled_workflows`) picks every active schedule whose `next_run_at <= now()`.
3. A workflow run is created and assigned to the configured agent or team.
4. `next_run_at` is recalculated from the CRON expression in the schedule's timezone.

A unique index on `(schedule_id, scheduled_for)` prevents the same minute slot from being dispatched twice — even if the dispatcher overlaps with itself.

---

## Sources & further reading

LenserFight's CRON dialect is the classical POSIX one. For deeper background, official docs, and an interactive expression builder:

- [`crontab(5)` — POSIX manual](https://man7.org/linux/man-pages/man5/crontab.5.html) — authoritative field syntax.
- [Wikipedia: cron](https://en.wikipedia.org/wiki/Cron) — history and dialect comparison.
- [crontab.guru](https://crontab.guru/) — interactive expression explainer (paste an expression, see what it means in plain English).
- [`pg_cron` documentation](https://github.com/citusdata/pg_cron) — the Postgres extension that drives the LenserFight dispatcher.
- [IANA Time Zone Database](https://www.iana.org/time-zones) — the canonical list of valid timezone identifiers.

---

## Related

- [CRON Scheduling tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling) — full walkthrough of creating, monitoring, and managing schedules.
- [Workflow inputs template](/en/reference/workflow-inputs-template) — JSON shape for the default inputs each scheduled run receives.
- [Automation rules](/en/tutorials/agent-walkthroughs/automation-rules) — event-driven triggers (alternative to time-based CRON).
