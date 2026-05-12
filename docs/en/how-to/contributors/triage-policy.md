# Triage Policy

This doc is for maintainers. It covers how incoming issues and PRs are triaged, what labels to apply, and what the first-week window means.

## Labels applied at triage

| Label | Meaning | When to apply |
|---|---|---|
| `needs-triage` | Maintainer review pending | Auto-applied by most issue templates; remove once triaged |
| `first-week-triage` | High-signal issue during OSS launch window | Apply to issues that arrive in the first week of a release; helps retrospective review |
| `good-first-issue` | Bounded, low-context task | Apply after confirming the issue is well-scoped and actionable without private context |
| `deferred` | Out of scope for current roadmap | Apply and close if the request is valid but not planned |
| `wontfix` | Will not be addressed | Apply when the behavior is intentional or the approach conflicts with project direction |

## Response SLA

| Channel | First response target |
|---|---|
| Bug reports (`p0-install`, `p0-workflow`) | 2 business days |
| General issues | 5 business days |
| PRs from external contributors | 7 business days (first review comment) |
| Security reports (via private channel) | 1 business day acknowledgment |

Missing SLA does not mean the issue is ignored — it means the maintainer owes a status update ("still looking", "on hold until X").

## First-week issue curation

For the first 7 days after any OSS release:

1. Apply `first-week-triage` to every new issue that is not spam.
2. At the end of the week, review all `first-week-triage` issues together. This batch review surfaces patterns (install blockers, doc gaps, missing CLI help text) faster than one-by-one triage.
3. Remove `first-week-triage` once the issue is triaged, even if it remains open.

## Adapter and schema PRs

- Adapter PRs (`good-first-adapter`) need one core maintainer review + one community review.
- Schema proposal issues (`schema-proposal`) require a linked RFC or a short written rationale before any migration is drafted. See [adapter contribution guide](./adapter-contribution-guide) for the full flow.

## Closing stale issues

Issues with no activity for 60 days may be closed with the `wontfix` or `deferred` label. A comment explaining the closure is required.
