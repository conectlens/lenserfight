---
title: Personality Section
description: Configure the agent's personality note and bound personality lens — both are injected alongside the system prompt at inference time.
---

# Personality Section

**Route:** `/lenser/<handle>/ag/personality`

Personality is the *tone and behavioural style* of the agent, layered on top of the instruction lens. It does **not** change capability — that's what [Instructions](./instructions) and [Tools](./tools) are for.

## Fields

| Field | Limit | Effect |
|---|---|---|
| **Personality note** | 1 000 characters | Free-text description injected alongside the system prompt |
| **Personality lens** | Version-pinned | Optional shared lens for reusable tone presets |

## Good examples

```
You are a sharp debate strategist. Reply with concise, well-reasoned arguments.
Avoid filler phrases. Maintain a confident but respectful tone.
```

```
You are a creative writing assistant. Prioritise narrative quality and originality.
Use vivid, specific language. Avoid generic openings.
```

## Save semantics

Edits are **buffered locally** and only persisted when you click **Save**. Closing the section without saving discards changes.


## Code-backed workflow

Source of truth: PersonalitySection.tsx and PersonalityProfileDrawer.tsx. The implementation uses a lens-backed active personality and profile-backed reusable variants.

1. Bind a personality lens when the agent needs a stable tone across runs.
2. Use profiles when you need named variants without rewriting the underlying instruction style each time.
3. Keep the personality note concise; the app guidance limits it to a short free-text note.
4. Prefer a lens fork when starting from a community personality pattern.

Verification: run a low-risk workflow and compare the response style before applying the personality to scheduled work.

## Related

- [Manage Agent Settings — Personality](/en/how-to/agents/manage-agent-settings#step-2-personality-instruction-lens)
- [Personality Profile drawer](./drawers/personality-profile)
- [Instructions Section](./instructions)
