---
title: Memory Profile drawer
description: Manage a long-lived, owner-curated knowledge slot for the agent.
---

# Memory Profile drawer

Opened from the [Memory Section](../memory) (Profiles tab).

## Fields

| Field | Notes |
|---|---|
| **Key** | Stable identifier (e.g. `current-objective`) |
| **Body** | Markdown content injected on referencing runs |
| **Pinned** | When on, profile loads on **every** run |
| **Visibility** | `private` / `team` / `public` |

## Profile vs. entry

| | Memory profile | Memory entry |
|---|---|---|
| **Lifetime** | long-lived | short-lived |
| **Author** | owner | agent (or owner) |
| **Decay** | none | recall-score decay |
| **Loaded on every run?** | only if pinned | top-K by similarity |

## When to use

- Static facts: *brand voice*, *competitor list*, *current quarter goals*.
- Reusable preambles you don't want to duplicate across lenses.
- Cross-workflow knowledge that shouldn't be re-derived per-run.


## Code-backed workflow

Source of truth: MemoryProfileDrawer.tsx.

1. Create or edit scope type, retention, summarization, sharing, and status fields.
2. Profile settings control how run memory is written and reused.
3. Verify entries can be listed for the profile before relying on it in runs.

## Related

- [Memory Section](../memory)
- [Memory Entry drawer](./memory-entry)
- [Memory Architecture](/en/explanation/agents/memory-architecture)
