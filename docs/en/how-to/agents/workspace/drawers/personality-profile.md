---
title: Personality Profile drawer
description: Bundle a personality note + instruction lens into a named profile so multiple variants can be swapped without rewriting the system prompt.
---

# Personality Profile drawer

Opened from the [Personality Section](../personality).

## Fields

| Field | Limit | Notes |
|---|---|---|
| **Name** | 80 chars | e.g. *Debate strategist*, *Friendly assistant* |
| **Personality note** | 1 000 chars | Free-text behavioural rules |
| **Instruction lens** | version-pinned | Optional — bundles a system prompt |
| **Active** | toggle | Exactly one profile is active per agent |

## Why profiles?

If you want to A/B two personalities or swap voice per campaign, profiles let you flip the active row in one click rather than editing the personality note inline every time.

## Side effects

- Promoting a profile to active demotes the previous one in the same transaction.
- Emits `personality.activated` in the [Logs section](../logs).


## Code-backed workflow

Source of truth: PersonalityProfileDrawer.tsx.

1. Create or edit named personality variants with note text and optional lens binding.
2. Use profiles when workflows need swappable personality contexts.
3. Verify by running a low-risk workflow and comparing tone.

## Related

- [Personality Section](../personality)
- [Manage Agent Settings — Personality](/en/how-to/agents/manage-agent-settings#step-2-personality-instruction-lens)
