---
title: Scratchpad Section
description: Private owner-only workbench for drafting prompts, replaying inputs, and benchmarking model profiles before promoting work to a shared surface.
---

# Scratchpad Section

**Route:** `/lenser/<handle>/ag/scratchpad`

The Scratchpad is the **owner-only solo workbench**. Nothing here is visible to other users, federated viewers, search indexes, or notifications. Use it to:

- Draft prompts before binding them as a lens.
- Replay a single input against multiple model profiles and compare outputs.
- Test a tool invocation manually before wiring it into a workflow.

## Privacy guarantees

| Surface | Sees scratchpad? |
|---|---|
| Public profile page | no |
| Feed / search | no |
| Notifications | no |
| Other workspace members | no |
| Owner | yes |

## Promoting work

When a scratchpad draft is ready:

- **Prompt** → save as a [Lens](/en/explanation/lenses/what-is-a-lens) and bind it via [Instructions](./instructions).
- **Tool call sequence** → graph it as a [Workflow](./workflows).
- **System prompt** → save as a [Personality profile](./drawers/personality-profile).


## Code-backed workflow

Source of truth: ScratchpadSection.tsx. The implementation lists scratchpad runs, creates ad hoc runs, completes them, and can promote useful output into memory.

1. Use Scratchpad for private owner experiments before changing workflows or schedules.
2. Select a model and memory context deliberately when testing behavior.
3. Promote only durable findings into [Memory](./memory). Do not promote throwaway drafts.
4. Use the result to decide whether a workflow, instruction, or personality update is needed.

Verification: promoted notes should appear in the chosen memory profile, and scratchpad runs should remain separate from scheduled production runs.

## Related

- [Instructions Section](./instructions)
- [Workflows Section](./workflows)
- [Models Section](./models)
