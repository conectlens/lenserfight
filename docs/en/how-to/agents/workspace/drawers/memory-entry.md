---
title: Memory Entry drawer
description: Inspect or edit a single short-lived memory entry written during an agent run.
---

# Memory Entry drawer

Opened from the [Memory Section](../memory) (Entries tab).

## Fields

| Field | Notes |
|---|---|
| **Content** | Markdown body of the memory |
| **Recall score** | `0..1`, decays with age unless reinforced |
| **Source run id** | Back-link to the run that wrote this entry |
| **TTL (days)** | Auto-expiry; `null` = never expires |
| **Tags** | Free-form labels for filtering |

## Recall score

- Created with score `1.0`.
- Each subsequent run that references the entry **reinforces** the score back up.
- Entries that haven't been referenced in N days decay below threshold and are filtered out at recall time.

## Manual override

You can edit the content and bump the score manually — useful when you want to *pin* a freshly-discovered fact without converting it to a full memory profile.


## Code-backed workflow

Source of truth: MemoryEntryDrawer.tsx.

1. View or create memory entries under a selected memory profile.
2. Manual entries should be concise, scoped, and tied to a profile.
3. Verify the entry appears in Memory with the expected scope filter.

## Related

- [Memory Section](../memory)
- [Memory Profile drawer](./memory-profile)
- [Memory Architecture](/en/explanation/agents/memory-architecture)
