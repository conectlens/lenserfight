---
title: Community Pilot Plan
description: Invite criteria, pilot scope, feedback channels, moderation escalation, and success criteria for the LenserFight community pilot.
---

# Community Pilot Plan

This document describes how the LenserFight Community Edition pilot is run — who is invited, what they can do, how feedback is collected, and what "success" means before opening more broadly.

---

## Invite criteria

Pilot participants should meet at least one of the following:

- Active contributor to an OSS AI/LLM tooling project (GitHub activity verifiable)
- Existing Chainabit user who has executed at least one workflow run
- Maintainer or frequent contributor to a prompt engineering community (Discord, Slack, GitHub Discussions)
- Referred by an existing pilot participant in good standing

Invite requests are managed via the GitHub Discussions category **"Pilot Access"**. The core team reviews requests within 5 business days.

---

## Pilot scope

The pilot is limited to the following surfaces. Features outside this list are **not** in scope for pilot feedback.

| Surface | Status in pilot |
|---------|----------------|
| Local battles (`lf battle local init`, `lf battle local run`) | Full access |
| Public lenses (read-only marketplace at `/marketplace`) | Full access |
| Workflow template gallery (`/workflows/templates`) | Full access |
| Battle creation and submission | Full access |
| BYOK AI execution | Full access with own API keys |
| Voting and AI judging | Requires `PUBLIC_BATTLES=true`; coordinator-enabled only |
| ELO leaderboard | Coordinator-enabled only |
| CRON scheduling | Opt-in; `CRON_SCHEDULING=true` flag required |
| Billing | Out of scope |
| Connector marketplace | Out of scope |

---

## Feedback channels

| Type | Channel |
|------|---------|
| Bug reports | GitHub Issues — use the `bug` label; adapter bugs use `adapter-bug` |
| Feature requests | GitHub Discussions — "Ideas" category |
| Schema proposals | GitHub Issues — use `schema-proposal` label with migration draft |
| General discussion | GitHub Discussions — "General" category |
| Moderation escalation | Email `moderation@lenserfight.org` (see below) |

Do not post credentials, API keys, or personal data in any public channel.

---

## Moderation escalation path

Content moderation runs automatically on battle submissions (dictionary + regex policies, always on; semantic policy optional). When automated moderation is insufficient:

1. **Flag in-app** — use the "Report" button on a battle or submission.
2. **Open a GitHub Issue** — private report via GitHub's security advisory feature if the content is sensitive.
3. **Email escalation** — send to `moderation@lenserfight.org` for urgent removals (expected response within 24 hours during pilot).

Repeated policy violations result in pilot access revocation and GitHub account ban from the repository.

---

## Success criteria

The pilot is considered successful when all of the following are true:

- [ ] At least 10 participants have completed a full battle lifecycle (create → submit → judge) without coordinator intervention
- [ ] Zero critical data-loss bugs (P0) open for more than 48 hours
- [ ] Community adapters: at least 2 `good-first-adapter` PRs opened by external contributors
- [ ] Workflow template gallery — [`templates/community/`](../../../templates/community) — has at least 5 community-submitted templates merged. The pilot ships with three seeds (`chat-summary`, `daily-digest`, `news-monitor`); two additional community submissions are required to clear this criterion.
- [ ] Moderation false-positive rate < 5% (measured via "Report" button usage vs. automated rejections)
- [ ] `lf battle local init` + `lf battle local run` documented flow works on macOS, Linux, and Windows WSL without manual patching

When these criteria are met, the core team will vote on opening Community Edition access more broadly.

---

## Related

- [Battle Launch Guide](/tutorials/battle-walkthroughs/battle-launch-guide)
- [Adapter Contribution Guide](/how-to/contributors/adapter-contribution-guide)
- [Governance](/explanation/community/governance)
- [Release Checklist](/how-to/contributors/release-checklist)
