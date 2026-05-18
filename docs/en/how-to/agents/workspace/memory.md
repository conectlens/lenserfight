---
title: Memory Section
description: Manage long-lived memory profiles and short-lived recall-scored entries that the agent reads on every run.
---

# Memory Section

**Route:** `/lenser/<handle>/ag/memory`

The Memory section holds two kinds of memory:

| Kind | Lifetime | Loaded on every run? |
|---|---|---|
| **Profile** | long-lived, owner-managed | only if **pinned** or referenced by id |
| **Entry** | short-lived, recall-scored | top-K by similarity to current input |

## Profiles tab

A **memory profile** is a named, markdown body acting as durable knowledge — think *"current objective"*, *"voice & tone"*, *"competitor list"*. Pinning a profile means it's loaded on **every** run.

Open the [Memory Profile drawer](./drawers/memory-profile) to add/edit.

## Entries tab

A **memory entry** is a row written by a successful run (or manually). Each entry has:

- A markdown body.
- A recall score (0..1) that decays with age unless reinforced.
- A TTL (`null` = never expires).
- A back-link to the source run.

Open the [Memory Entry drawer](./drawers/memory-entry) to inspect or edit.

## How it feeds runs

At the start of each run:

1. All **pinned profiles** are concatenated into the system context.
2. The top-K **entries** by similarity to the current input are appended.
3. The model sees the merged context before the user prompt.


## Code-backed workflow

Source of truth: MemorySection.tsx, MemoryProfilesTab.tsx, MemoryEntriesTab.tsx, MemoryProfileDrawer.tsx, and MemoryEntryDrawer.tsx. The implementation split profiles from entries. Profiles define scope and retention; entries are the stored facts or notes.

1. Create a profile before expecting entries to appear. Entries are filtered by profile and scope.
2. Choose scope deliberately: agent, team, workflow, or workspace-level memory changes who can reuse the entry.
3. Let successful runs write memory when possible; add manual entries for operator corrections or seeded context.
4. Delete profiles only after checking whether workflows depend on that memory context.

Verification: run a workflow that writes memory, then confirm the entry appears under the selected profile and scope.

## Related

- [Memory Architecture](/en/explanation/agents/memory-architecture)
- [Memory per Agent](/en/reference/internals/memory-per-agent)
