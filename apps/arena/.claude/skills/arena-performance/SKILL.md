---
name: arena-performance
description: Fix performance issues in apps/arena for leaderboards, battles, rankings, vote/reaction summaries, and high-cardinality result pages.
---

# Arena Performance

## Rules

- Leaderboards must page or window results.
- Ranking queries must avoid full-table client sorting.
- Battle lists should render summary cards only on first load.
- Expensive aggregates must be checked for index support and payload size.
- Do not request full battle history when only top slices are visible.

## Gotchas

- Rank pages often fail because the UI requests more rows “just in case”.
- Score, XP, reactions, and joins can multiply row cost quickly.