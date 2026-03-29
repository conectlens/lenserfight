---
name: repo-performance-guard
description: Enforce performance-safe query and rendering patterns across this Nx monorepo. Use when working on Vite freezes, Supabase overfetching, pagination, caching, CPU hotspots, memory pressure, or large seeded datasets.
disable-model-invocation: true
---

# Repo Performance Guard

Apply this skill when editing any app or library that reads large datasets from Supabase or renders lists in Vite apps.

## Core goal

Prevent the frontend from freezing or crashing when local Supabase contains large seeded datasets.

## Non-negotiable rules

1. Never allow unbounded list reads.
2. Every list query must have a hard limit.
3. Every feed must paginate or use cursor-based incremental loading.
4. Never select more columns than the screen needs.
5. Never fetch child relations eagerly by default on list pages.
6. Never rely on frontend filtering to reduce large result sets after fetch.
7. Push filtering, sorting, and limiting into Supabase queries.
8. Prefer keyset/cursor pagination for large feeds.
9. Cache only stable and bounded datasets.
10. Treat “load all rows” as a defect.

## Repo-specific gotchas

- Large local seeds in `supabase/seeds/11_*` through `21_*` can make naive queries destroy Vite responsiveness.
- `apps/web` is the highest-risk frontend for overfetching because threads, prompts, replies, tags, reactions, and multilingual data all compound payload size.
- `libs/data/repositories` and `libs/data/supabase` are likely the central places where unsafe query shapes should be fixed first.
- If a Supabase view or RPC returns oversized payloads, prefer shrinking it or replacing it with narrower REST-compatible access patterns.
- Do not fix frontend freezes by only hiding UI. Reduce the query size and retained state size.

## Required workflow

- [ ] Inspect the screen entrypoint and identify the exact query path
- [ ] Find the repository/data access function
- [ ] Verify select list, filters, order, and hard limit
- [ ] Verify pagination strategy
- [ ] Verify relation loading strategy
- [ ] Check for duplicate fetches and init waterfalls
- [ ] Check render loops, expensive mapping, and retained arrays in React state
- [ ] Run validation before finalizing

## Validation loop

1. Identify the largest list on the affected screen.
2. Record current query shape and page size.
3. Reduce payload to the minimum viable columns.
4. Add or fix hard limit and pagination.
5. Re-test initial render, navigation, and incremental loading.
6. If still slow, inspect joins, RPC/view payload size, and client rerender count.
7. Do not finalize until the screen can survive large local seed volumes without trying to hold massive arrays in memory.

## Additional resources

- Read `references/performance-checklist.md` for review criteria.
- Read `references/supabase-query-rules.md` when changing repository or Supabase access code.