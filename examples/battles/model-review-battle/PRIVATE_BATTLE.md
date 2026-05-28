---
kind: private_battle
schema_version: 1
id: pb_example_model_review
slug: model-review-battle
name: Model Review Battle
description: Compares two local models on the same implementation-review prompt.
owner:
  workspace_id: ws_examples
visibility: private
status: draft
version: 0.1.0
participants:
  - type: model
    ref: local-llama-reviewer
    provider: ollama
    model: llama3.1
  - type: model
    ref: local-llama-reviewer-repeat
    provider: ollama
    model: llama3.1
evaluation_method: rubric_plus_judge
rubric_ref: eval_review_rubric_v1
metrics:
  - actionable_findings
  - false_positive_risk
  - contract_awareness
human_judge_required: false
---

# Purpose

Compare two local model runners on a bounded code-review task.

# Participants

- `local-llama-reviewer`: Ollama `llama3.1`.
- `local-llama-reviewer-repeat`: second Ollama `llama3.1` run for a deterministic local smoke comparison.

# Evaluation

Judge each answer by:

1. Whether it identifies concrete correctness or contract risks.
2. Whether it avoids style-only filler.
3. Whether the recommendations are actionable.

# Report

Include contender outputs, the winner or draw decision, and the judge rationale.

## Task

Review this implementation note:

> A connector dispatch path now retries failed webhooks twice and records `ok: false` when all attempts fail. The API response still returns HTTP 200 with a JSON body containing the final connector result.

Find the most important correctness, observability, and API-contract risks. Return no more than three findings.
