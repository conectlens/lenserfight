---
title: Failed Case drawer
description: Read-only side-by-side diff for one failing evaluation case — expected vs. actual, with a link to the run trace.
---

# Failed Case drawer

Opened from the [Evaluations Section](../evaluations) or [Evaluation drawer](./evaluation) when a case fails.

## Sections

| Section | Content |
|---|---|
| **Expected** | The assertion's expected value (rendered by type) |
| **Actual** | The agent's actual output for this case |
| **Diff** | Inline character-level diff for `substring` / `regex` types |
| **Run trace** | Link to the originating run (opens [Run Detail](./run-detail)) |
| **Token cost** | Prompt + completion tokens consumed |

## Triage flow

1. Read the diff — is the actual output close, or wildly off?
2. Open the run trace to inspect tool calls and intermediate states.
3. Decide:
   - Update the case (assertion was wrong).
   - Update the instruction lens (prompt regression).
   - Update the model profile (model regression).
   - Update tooling (tool regression).


## Code-backed workflow

Source of truth: FailedCaseDrawer.tsx.

1. Inspect failed evaluation output, expected result, score, and diff context.
2. Use it for diagnosis only; fixes belong in cases, rubrics, prompts, models, or workflows.
3. Verify the fix by rerunning the suite and comparing against the baseline.

## Related

- [Evaluation drawer](./evaluation)
- [Run Detail drawer](./run-detail)
