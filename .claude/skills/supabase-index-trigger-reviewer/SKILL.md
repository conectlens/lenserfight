---
name: supabase-index-trigger-reviewer
description: Review Postgres indexes, triggers, write amplification, and performance risk in Supabase migrations. Use for slow queries, missing indexes, trigger-heavy designs, stale propagation issues, and DB-side performance tuning.
disable-model-invocation: true
---

# Supabase Index Trigger Reviewer

## Use when
- query performance is poor
- triggers are complex or fragile
- migration changes may increase write cost or contention

## Workflow
1. Identify likely read/write hotspots.
2. Review index coverage and trigger side effects.
3. Return exact indexing or trigger simplification recommendations.
4. Run 'npx supabase migration up --local' to ensure the created migrations applied successfully.

## Load only when needed
- [Index and trigger review guide](references/REFERENCE.md)
- [Performance checklist](assets/db-perf-checklist.md)