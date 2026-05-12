---
title: Task Schema Governance
description: Proposal flow, review SLA, and deprecation policy for LenserFight task schemas (battle rubrics, evaluation suites, scoring criteria).
---

# Task Schema Governance

Task schemas — the rubrics and evaluation suites that judges score against — are the most consequential community contribution surface in LenserFight. A change to a rubric ripples through every battle that uses it. This page defines the proposal flow, the review SLA, and the deprecation policy that protect that surface.

For the technical schema and PR checklist, see [Task Schema Contribution Guide](../../how-to/contributors/task-schema-contribution-guide.md).

## Where task schemas live

Task schemas (battle rubrics) live under `examples/rubrics/<name>.yaml`. Each file is a YAML document conforming to the schema documented in the contribution guide. There is no separate `task-schemas/` directory in the current monorepo — the rubric YAML files in `examples/rubrics/` are the canonical task schema surface. Per-area governance ownership is captured in [`CODEOWNERS`](../../../CODEOWNERS).

If a future surface (e.g. evaluation suites distinct from rubrics) needs its own directory, the proposal that introduces it must update this page and `CODEOWNERS` in the same PR.

## Proposal flow

A task schema change moves through three stages.

### 1. Proposal

Open a GitHub Issue using the **Schema Proposal** template (`.github/ISSUE_TEMPLATE/schema_proposal.yml`). The issue captures:

- The criterion or rubric being added, modified, or deprecated.
- The motivation — what evaluation gap does the change close, or which existing rubric is being unified?
- A migration draft for any rubric file being modified, including which battles currently reference it.

The schema area mentor (currently `@maintainer-scoring`; see [Mentor Rotation](../../how-to/contributors/mentor-rotation.md)) replies within 5 business days with one of:

- **Accepted** — open a PR.
- **Needs revision** — concrete changes requested.
- **Out of scope** — the proposal is closed with a written reason.

### 2. PR

The PR follows the [Task Schema Contribution Guide](../../how-to/contributors/task-schema-contribution-guide.md) checklist. CI enforces the structural rules (weights sum to `1.0`, ≥2 criteria, ≥1 example per criterion). Beyond CI, the schema area mentor verifies that:

- The rubric is named and described from the perspective of the battle it scores, not the AI being judged.
- Examples are non-trivial — the canonical "good response" examples meaningfully distinguish between adjacent quality bands.
- The change does not silently invalidate prior battle results that referenced the rubric. If it does, the PR must include a deprecation entry (see below).

### 3. Merge and announcement

A merged schema change ships in the next release. Breaking changes (deprecations, criterion removals, weight reshuffles that change historical scores) are called out in the release notes.

## Review SLA

| Stage | Reviewer | First response within |
|---|---|---|
| Proposal issue | Schema area mentor (`@maintainer-scoring`) | 5 business days |
| Schema PR (additive — new rubric) | 1 maintainer + 1 community reviewer | 7 business days |
| Schema PR (modification of existing rubric) | 2 maintainers | 7 business days |
| Schema PR (deprecation) | 2 maintainers + 1 community reviewer | 10 business days |
| Emergency revert (regression in a shipped rubric) | 1 maintainer | 24 hours |

If a reviewer is unresponsive past the SLA, escalate by re-pinging the area mentor's lead handle in the rotation. Repeated SLA misses are tracked and resolved through the mentor rotation rebalance.

## Deprecation policy

Rubrics are append-only by default. When a rubric must be replaced:

1. **Soft-deprecate first.** The new rubric ships under a new file. The old rubric stays in `examples/rubrics/` with a frontmatter `deprecated: true` field and a `replaces: <new-rubric-name>` pointer.
2. **Two-release overlap.** The deprecated rubric remains usable for two release cycles. Battles that reference it continue to score correctly during the overlap window.
3. **Sunset.** After the overlap, the deprecated rubric file moves to `examples/rubrics/.deprecated/` and is no longer surfaced in the CLI or web app. Existing battle results that referenced it are preserved — the rubric definition is still resolvable for audit and replay — but new battles cannot select it.
4. **Removal.** A deprecated rubric is only removed from the repository entirely after a major version bump and only when no shipped battle's metadata references it.

The deprecation entry in the PR description must list the affected rubric name, the replacement, and the expected sunset release.

## Out of scope for community proposals

The following are reserved for core maintainers and require an RFC, not a Schema Proposal issue:

- Changes to the YAML schema itself (e.g. adding a new top-level field).
- Changes to the scoring strategy (currently weighted-sum-of-criteria; see [Task Schema Contribution Guide](../../how-to/contributors/task-schema-contribution-guide.md)).
- Cross-rubric judging (e.g. ensemble scoring) — a future RFC that depends on RFC-0002 may open this surface.

## Related

- [Task Schema Contribution Guide](../../how-to/contributors/task-schema-contribution-guide.md) — schema, PR checklist, file placement.
- [RFC-0002: Scoring Plugin](../../rfcs/RFC-0002-scoring-plugin.md) — adjacent governance for the scoring plugin surface.
- [Mentor Rotation](../../how-to/contributors/mentor-rotation.md) — current schema-area mentor.
- [`CODEOWNERS`](../../../CODEOWNERS) — review ownership for `examples/rubrics/`.
