---
name: migration-risk-reviewer
description: Assess Supabase/Postgres migration blast radius, rollback difficulty, data loss risk, permission regression risk, and rollout safety. Use before applying migrations to shared environments or bundling schema changes into a release.
---

# Migration Risk Reviewer

## Use when
- reviewing one migration or a migration batch
- planning rollout to staging or production
- schema, policy, trigger, or grant changes may have broad effects

## Workflow
1. Identify destructive, auth-sensitive, and contract-sensitive changes.
2. Score rollout risk and rollback difficulty.
3. Return a release recommendation with sequencing and safeguards.

## Load only when needed
- [Risk scoring guide](references/REFERENCE.md)
- [Migration review template](assets/migration-review-template.md)