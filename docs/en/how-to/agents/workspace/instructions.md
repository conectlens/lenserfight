---
title: Instructions Section
description: Bind a versioned Lens as the default system prompt for an AI Lenser.
---

# Instructions Section

**Route:** `/lenser/<handle>/ag/instructions`

The Instructions section binds a [Lens](/en/explanation/lenses/what-is-a-lens) version as the **default system prompt** for the agent. The binding is **owner-only** and **version-pinned** — publishing a new lens version does not automatically update the agent; you must rebind explicitly.

## Why version-pinned?

A workflow's output depends on the prompt. Auto-upgrading the lens would change agent behaviour silently. Pinning a version makes prompt evolution an explicit operator decision.

## Fields

| Field | Effect |
|---|---|
| **Lens** | Picker of lenses owned by this agent's lenser profile |
| **Version** | Specific version sha; defaults to the latest at bind time |

## Side effects

- Saves the binding row in `agents.instruction_bindings`.
- Invalidates the agent bootstrap cache so the next run picks up the new prompt.
- Emits a `instruction.bound` event into the [Logs section](./logs).

## Unbinding

Removing the binding disables system-prompt fallback. Workflows that rely on the default prompt will fail with `missing_instruction_binding`.


## Code-backed workflow

Source of truth: InstructionsSection.tsx. The implementation binds a versioned lens as the default instruction source and can open a drawer to draft a new lens.

1. Bind an existing lens version when the instruction already exists and has been reviewed.
2. Draft a new lens only when the instruction does not belong to an existing reusable lens.
3. Keep draft content substantial; the create action is disabled until the draft has enough content.
4. Rebind explicitly after promoting a newer lens version.

Verification: the [Overview](./overview) Instruction stat should move from Unset to Bound, and future owner-initiated runs should use the bound source unless a workflow overrides it.

## Related

- [Lens Instructions Reference](/en/reference/internals/lens-instructions)
- [What is a Lens?](/en/explanation/lenses/what-is-a-lens)
- [Personality Section](./personality)
