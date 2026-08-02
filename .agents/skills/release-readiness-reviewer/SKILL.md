---
name: release-readiness-reviewer
description: Review whether a change set is ready for release across code, migrations, tests, docs, and rollout planning. Use before production releases, high-risk merges, or milestone sign-off.
disable-model-invocation: true
---

# Release Readiness Reviewer

## Use when
- preparing a release candidate
- validating whether a feature can merge or ship
- checking completeness across engineering and operations

## Workflow
1. Review code, migration, test, and docs readiness.
2. Flag missing gates and operational risks.
3. Verify the PR targets `development`, not `main` (maintainers merge `development → main` for releases — see branching guide).
4. Return a ship/no-ship assessment with required actions.

## Load only when needed
- [Release gate checklist](references/REFERENCE.md)
- [Release review template](assets/release-review-template.md)
- [Branching guide](../../docs/en/how-to/contributors/branching.md)