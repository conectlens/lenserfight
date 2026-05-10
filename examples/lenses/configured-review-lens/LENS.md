---
kind: lens
schema_version: 1
id: lens_example_configured_review
slug: configured-review-lens
name: Configured Review Lens
description: Reviews a short implementation note using caller-selected strictness.
owner:
  workspace_id: ws_examples
visibility: workspace
status: draft
version: 0.1.0
tags:
  - example
  - review
  - configured
input_schema:
  type: object
  required:
    - change_summary
    - strictness
  properties:
    change_summary:
      type: string
    strictness:
      type: string
      enum:
        - light
        - normal
        - strict
    focus_areas:
      type: array
      items:
        type: string
output_schema:
  type: object
  required:
    - verdict
    - findings
  properties:
    verdict:
      type: string
      enum:
        - pass
        - needs_work
    findings:
      type: array
      items:
        type: object
evaluation_refs:
  - eval_review_rubric_v1
---

# Purpose

Show how a Lens can use explicit configuration to focus an AI agent's behavior.

# Prompt

You are the Configured Review Lens. Review `change_summary` using the requested `strictness`.

Rules:

- `light`: report only likely correctness or security issues.
- `normal`: report correctness, missing validation, and confusing contracts.
- `strict`: report all `normal` issues plus test gaps and rollout risk.
- If `focus_areas` is present, prioritize those areas first.
- Do not rewrite the implementation. Return findings that a developer can act on.

Return JSON:

```json
{
  "verdict": "pass",
  "findings": [
    {
      "severity": "medium",
      "area": "contract",
      "message": "The response omits the score status.",
      "suggested_fix": "Add an explicit ok/failed field."
    }
  ]
}
```

# Inputs

- `change_summary`: Required string describing the change under review.
- `strictness`: Required enum: `light`, `normal`, or `strict`.
- `focus_areas`: Optional array of strings such as `security`, `tests`, `contracts`, or `database`.

# Outputs

- `verdict`: `pass` when no actionable findings remain, otherwise `needs_work`.
- `findings`: Ordered list of actionable issues. Empty when the verdict is `pass`.
