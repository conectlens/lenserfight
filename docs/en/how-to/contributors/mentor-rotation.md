---
title: Mentor Rotation
description: 8-week rotation table for adapter and plugin contribution mentors. Identifies the on-call handle for each area.
---

# Mentor Rotation

Adapter and plugin mentorship rotates on an 8-week cadence so no single maintainer carries the queue indefinitely. The handle in each cell is the on-call mentor for that week — ping them in your draft PR or your exploratory issue. If you don't get a response within the SLA in [Adapter Mentorship Paths](./adapter-mentorship.md), escalate by re-pinging the area's lead handle (the row's first cell).

## Rotation table

The table starts on the Monday of week 1. After week 8, the rotation repeats from week 1.

| Week | Auth mentor | Providers mentor | Scoring mentor |
|---|---|---|---|
| 1 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 2 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 3 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 4 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 5 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 6 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 7 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |
| 8 | `@maintainer-auth` | `@maintainer-providers` | `@maintainer-scoring` |

The rotation list is intentionally placeholder. The core team will replace the handles with named maintainers before the public launch announcement and update this table in the same PR.

## Coverage rules

- **One mentor per area per week.** A single human cannot be on rotation for two areas in the same week.
- **Holidays count.** A mentor expecting to be unavailable for more than 3 business days swaps with the next-week mentor in the same area and updates the table in a PR.
- **Escalation.** If the on-call mentor doesn't respond within the SLA, ping the area lead (row 1 of [Adapter Mentorship Paths](./adapter-mentorship.md#mentors-per-area)). The lead either picks up the review or reassigns to another rotation member.

## Out-of-rotation review

A core maintainer can always pick up a review out of rotation — the table determines who is *guaranteed* to respond, not who is *allowed* to respond. Community reviewers are encouraged to leave non-blocking comments on any draft PR regardless of rotation.

## Related

- [Adapter Mentorship Paths](./adapter-mentorship.md) — first-PR walkthrough and the per-area mentor table.
- [Adapter Contribution Guide](./adapter-contribution-guide.md) — full review process and PR labels.
- [Triage Policy](./triage-policy.md) — how the maintainer triage queue is processed.
