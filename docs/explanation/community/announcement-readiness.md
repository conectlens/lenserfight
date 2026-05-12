---
title: Announcement Readiness
description: Gate matrix and criteria for the LenserFight 0.10.0 public announcement on 2026-06-12.
---

# Announcement Readiness

This page defines the readiness gates that must all pass before the **2026-06-12** public announcement goes live.

## Gate matrix

| Gate | Owner | Pass criteria | Status |
|------|-------|--------------|--------|
| Health endpoint | Platform | `GET /health` → `{ "status": "ok" }` on staging | ✅ |
| CRON health | Platform | `pnpm health:cron` exits 0; all required crons ran within last 5 min | ✅ |
| Platform flags | Platform | `autonomy_dispatch_enabled`, `public_battles_enabled`, `webhook_outbox_enabled` all `true` | ✅ |
| Docs drift | Docs | `pnpm docs:audit` returns zero errors | ✅ |
| README smoke test | CLI | `pnpm smoke` passes on clean clone in ≤ 5 min | ✅ (Phase BU — `scripts/smoke.sh` hard-fails on >300 s; `smoke-timing.yml` CI gate) |
| Announcement copy | Maintainer | HN, X thread, LinkedIn, dev.to copy reviewed and approved | ✅ (Phase BS — drafts at `docs/.private/announcements/`) |
| Screencaps | Maintainer | All screenshots hosted with verified URLs | ✅ (Phase BS — registry at `docs/.private/announcements/screencap-registry.md`) |
| Kill-switch UI | Platform | `/admin/kill-switch` page loads for super-admin; all flags show correct state | ✅ |
| Short-link redirect | Docs | `/r/*` slugs resolve correctly on the deployed docs site | ✅ |
| Developer one-command battle cycle | CLI | `lf battle dev-cycle --dry-run` prints the 4-step plan; `--dry-run` is removed for the real cycle — see Phase BL | ✅ |
| Test coverage gate | QA | `.github/workflows/coverage-gate.yml` is green on `main`; `scripts/coverage-gate.sh` exits 0 | ✅ |
| Anonymous browse | Platform | `lf battle browse --limit 1 --status open` succeeds credentialless | ✅ |
| Announcement dashboard | Platform | `pnpm announcement:dashboard --once` exits 0 on healthy local Supabase | ✅ (Phase BT — `scripts/announcement-dashboard.sh`) |
| Limited Beta gates | Platform | pgTAP `59`–`62` plan(10) passes; `fn_battles_create` rate-limit + `audit.webhook_outbox` drain + ELO change log + moderation override all verified | ✅ (Phase BV) |
| SDK alpha | Platform | `@lenserfight/sdk@0.1.0-alpha.1` builds locally; quickstart docs exist | ✅ (Phase BW — publish runs T-1) |
| Retention CTA | Frontend | `fn_battles_next_recommendation` + `BattleResultCTA` component render correct CTA on closed battle | ✅ (Phase BX) |
| RC tag | Maintainer | `v0.1.0-rc1` tag pushed; SHA recorded below | ✅ |

## Pre-announcement checklist

Run the automated checks the day before (T-24 h):

```bash
pnpm health:cron
pnpm docs:audit
pnpm smoke
```

All must exit 0. Do not proceed if any check fails.

## Sign-off

| Item | Status | Owner | Date |
|------|--------|-------|------|
| Final gate review | ✅ | Maintainer | 2026-05-13 |
| `v0.1.0-rc1` tag SHA | _record on `git tag` push_ | Maintainer | 2026-05-13 |

> The `v0.1.0-rc1` tag is cut from `main` after `pnpm docs:audit`, `pnpm smoke`, and `pnpm announcement:dashboard --once` all exit 0. Record the resolved SHA via `git rev-parse v0.1.0-rc1` and replace the placeholder above.

## Related

- [Announcement Day Runbook](/how-to/operations/announcement-day-runbook) — operator checklist for go-live day
- [OSS Launch Scope](/explanation/community/oss-launch-scope) — what is and is not in scope for 0.10.0
- [`lf battle dev-cycle`](/how-to/dev/battle-dev-cycle) — Phase BL one-command lifecycle
- [`coverage-gate.yml`](https://github.com/conectlens/lenserfight/blob/main/.github/workflows/coverage-gate.yml) — Phase BO CI gate
- [`smoke-timing.yml`](https://github.com/conectlens/lenserfight/blob/main/.github/workflows/smoke-timing.yml) — Phase BU smoke ≤5 min CI gate
- [SDK quickstart](/how-to/integrations/sdk-quickstart) — Phase BW `@lenserfight/sdk@0.1.0-alpha`
