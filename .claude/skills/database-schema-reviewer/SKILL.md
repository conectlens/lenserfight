---
name: database-schema-reviewer
description: Review PostgreSQL schema design for integrity, performance, and migration safety. Use when modifying supabase/migrations/* or supabase/functions/*.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash
---

Run database schema review for $ARGUMENTS.

Purpose  
Evaluate database schema quality, integrity, and performance risks.

Primary scope

- supabase/migrations/*
- supabase/functions/*
- supabase/tests/*

Workflow

[ ] 1 Inspect schema definition

Read the latest migration files in:

supabase/migrations/*

[ ] 2 Inspect SQL functions and triggers

Review:

supabase/functions/*

[ ] 3 Evaluate schema integrity

Check:

- primary keys
- foreign keys
- unique constraints
- nullability rules
- enum usage

[ ] 4 Evaluate performance risks

Check:

- missing indexes
- large relation scans
- hot tables
- unbounded joins

[ ] 5 Evaluate migration safety

Look for:

- destructive schema changes
- column type rewrites
- large table locks
- incompatible constraints

Load references only when needed

- Review process: [Schema review method](references/REFERENCE.md)
- Integrity rules: [Database constraints and relationship checks](references/integrity-rules.md)
- Performance rules: [Indexing and query optimization guidance](references/performance-rules.md)
- Security rules: [RLS policies and database security checks](references/security-rules.md)

Output

Report:

- schema risks
- missing constraints
- index recommendations
- migration safety issues
- suggested improvements
