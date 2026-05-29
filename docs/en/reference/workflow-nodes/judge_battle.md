---
title: Judge Battle
description: Invokes an AI judge to evaluate and score all contender submissions in a battle.
---

# Judge Battle

## Overview

The Judge Battle node retrieves every accepted submission for the specified battle and sends each one to an AI judge model for evaluation against a defined set of scoring criteria. Each criterion is scored independently on a numeric scale and the raw per-criterion scores are emitted for downstream aggregation. When `parallel_evaluation` is enabled, all submissions are evaluated concurrently to minimise wall-clock time. The node transitions the battle's status to `judging` at the start and to `judged` upon successful completion.

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `battle_id` | string | Yes | — | UUID of the battle to judge. Can be a static value or a template expression referencing an upstream node's output (e.g. `&#123;&#123;nodes.battle_create.output.battle_id&#125;&#125;`). |
| `model_key` | string | Yes | — | Identifier of the judge model to use (e.g. `"claude-sonnet-4-6"`, `"gpt-4o"`). Must be a model available in the workspace's AI provider settings. |
| `criteria` | array of objects | Yes | — | Scoring dimensions. Each element must have a `name` (string) and a `description` (string) that is passed verbatim to the judge. |
| `max_score_per_criterion` | integer | No | `10` | Upper bound for each criterion's score. The judge is instructed to produce a score in `[0, max_score_per_criterion]`. |
| `parallel_evaluation` | boolean | No | `false` | When `true`, all submissions are evaluated concurrently. Increases throughput but also increases token consumption and may hit rate limits for large battles. |
:::

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Optional upstream data. A `battle_id` key here overrides the static config value. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `battle_id`, `judged_at` (ISO-8601 timestamp), and `evaluations` — an array of objects, one per submission, each with `contender_id`, `submission_id`, and `scores` (an object mapping criterion name to numeric score). |

## Example

<div v-pre>

```json
{
  "nodeType": "judge_battle",
  "config": {
::: v-pre
    "battle_id": "{{nodes.battle_create.output.battle_id}}",
:::
    "model_key": "claude-sonnet-4-6",
    "criteria": [
      {
        "name": "correctness",
        "description": "Does the solution produce the correct output for all standard inputs?"
      },
      {
        "name": "efficiency",
        "description": "How efficiently does the solution use time and memory relative to optimal?"
      },
      {
        "name": "readability",
        "description": "Is the code clean, well-named, and easy to understand without comments?"
      }
    ],
    "max_score_per_criterion": 10,
    "parallel_evaluation": true
  }
}
```

</div>

## Notes

- Each criterion description is injected directly into the judge's system prompt; write descriptions that are unambiguous and self-contained so the model does not need to infer intent.
- `parallel_evaluation: true` can significantly reduce latency for battles with many submissions, but each parallel call counts independently against the workspace's AI provider rate limits.
- If the battle has no accepted submissions when this node executes, the node succeeds and emits `evaluations: []`; downstream nodes should handle this empty case to avoid errors.
- BYOK (Bring Your Own Key) workspaces resolve `model_key` against their own provider credentials; if the key does not match a configured provider, the node fails immediately with a configuration error.
