---
title: Announcement Readiness
description: Gate matrix and criteria for the LenserFight 0.10.0 public announcement on 2026-06-12.
---

# Announcement Readiness

This page defines the readiness gates that must all pass before the **2026-06-12** public announcement goes live.

## Gate matrix

| Gate | Owner | Pass criteria |
|------|-------|--------------|
| Health endpoint | Platform | `GET /health` → `{ "status": "ok" }` on staging |
| CRON health | Platform | `pnpm health:cron` exits 0; all required crons ran within last 5 min |
| Platform flags | Platform | `autonomy_dispatch_enabled`, `public_battles_enabled`, `webhook_outbox_enabled` all `true` |
| Docs drift | Docs | `pnpm docs:audit` returns zero errors |
| README smoke test | CLI | `pnpm smoke` passes on clean clone in ≤ 5 min |
| Announcement copy | Maintainer | HN, X thread, LinkedIn, dev.to copy reviewed and approved |
| Screencaps | Maintainer | All screenshots hosted with verified URLs |
| Kill-switch UI | Platform | `/admin/kill-switch` page loads for super-admin; all flags show correct state |
| Short-link redirect | Docs | `/r/*` slugs resolve correctly on the deployed docs site |

## Pre-announcement checklist

Run the automated checks the day before (T-24 h):

```bash
pnpm health:cron
pnpm docs:audit
pnpm smoke
```

All must exit 0. Do not proceed if any check fails.

## Related

- [Announcement Day Runbook](/how-to/operations/announcement-day-runbook) — operator checklist for go-live day
- [OSS Launch Scope](/explanation/community/oss-launch-scope) — what is and is not in scope for 0.10.0
