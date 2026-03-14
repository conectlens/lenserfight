---
name: supabase-schema-reviewer
description: Review Supabase/Postgres schema design, table ownership, normalization, defaults, relationships, and migration coherence. Use for new tables, column design, view design, schema cleanup, and database modeling decisions.
---

# Supabase Schema Reviewer

## Use when
- adding or changing tables, views, or relationships
- reviewing naming, ownership, or normalization decisions
- checking whether migrations form a coherent model

## Workflow
1. Inspect schema intent, ownership model, and relationships.
2. Flag weak naming, missing constraints, awkward defaults, and modeling debt.
3. Return exact schema recommendations with migration notes.

## Load only when needed
- [Schema review method](references/REFERENCE.md)
- [Schema decision template](assets/schema-decision-template.md)