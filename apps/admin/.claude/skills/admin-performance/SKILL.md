---
name: admin-performance
description: Fix performance issues in apps/admin caused by oversized dashboards, moderation queues, analytics tables, bulk lists, and expensive Supabase queries.
---

# Admin Performance

## Rules

- Every admin table must use server-side pagination.
- Every filterable table must push filtering to the backend.
- Never preload full moderation queues or analytics result sets.
- Use narrow summary queries first, detail expansion second.
- Bulk actions must operate on explicit page or selected IDs, never on an implicitly loaded full dataset.

## Gotchas

- Admin pages often look internal, but they are the easiest place to accidentally fetch everything.
- Charts must aggregate server-side when possible.
- CSV/export paths must be isolated from interactive table rendering paths.