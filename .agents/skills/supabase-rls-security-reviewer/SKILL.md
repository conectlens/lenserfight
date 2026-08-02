---
name: supabase-rls-security-reviewer
description: Review Supabase RLS, grants, schema exposure, views, and SQL function privilege boundaries. Use for policy design, auth-sensitive migrations, exposed-schema review, security-definer risk, and least-privilege database hardening.
disable-model-invocation: true
---

# Supabase RLS Security Reviewer

## Use when
- any migration touches RLS, grants, policies, views, or SQL functions
- public exposure, owner access, or admin access must be reviewed
- least-privilege correctness is critical

## Workflow
1. Inspect exposure surface: schemas, tables, views, functions, and grants.
2. Check RLS policy correctness by actor and operation.
3. Return concrete risks, exploit paths, and hardened replacements.
4. Run 'npx supabase migration up --local' to ensure the created migrations applied successfully.

## Load only when needed
- [RLS and security guide](references/REFERENCE.md)
- [Policy review checklist](assets/policy-checklist.md)
- [Privilege matrix template](assets/privilege-matrix.md)