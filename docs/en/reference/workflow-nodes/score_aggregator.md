---
title: Score Aggregator
description: Collects scores from one or more judge runs and produces a final ranked leaderboard for a battle.
---

# Score Aggregator

## Overview

The Score Aggregator node reads all evaluation records for a battle — whether produced by a single `judge_battle` node or by multiple independent judge runs — and reduces the per-criterion, per-contender scores into a single aggregate score per contender. The resulting leaderboard is written back to the battle record in the database and is emitted downstream. The aggregation algorithm is controlled by `aggregation_method`, and the node enforces a minimum quorum via `min_evaluations` before producing results.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `battle_id` | string | Yes | — | UUID of the battle whose evaluations to aggregate. Supports template expressions. |
| `aggregation_method` | `"mean"` \| `"median"` \| `"weighted_mean"` | No | `"mean"` | Algorithm used to combine multiple scores into one. |
| `weight_map` | object | No | — | Maps criterion name to a numeric weight. Only used when `aggregation_method` is `"weighted_mean"`. Weights are normalised to sum to 1 before application. |
| `min_evaluations` | integer | No | `1` | Minimum number of evaluation records required per contender. Contenders with fewer evaluations are excluded from the leaderboard and flagged in the output. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Optional upstream data. Accepts `battle_id` to override the static config. Can also accept the `evaluations` array emitted by a `judge_battle` node to avoid a redundant database read. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `battle_id`, `aggregated_at` (ISO-8601 timestamp), `leaderboard` (array of objects sorted by `total_score` descending, each with `contender_id`, `total_score`, `rank`, and `score_breakdown` by criterion), and `excluded_contenders` (array of contender IDs that did not meet `min_evaluations`). |

## Example

<div v-pre>

```json
{
  "nodeType": "score_aggregator",
  "config": {
    "battle_id": "{{nodes.judge_battle.output.battle_id}}",
    "aggregation_method": "weighted_mean",
    "weight_map": {
      "correctness": 0.5,
      "efficiency": 0.3,
      "readability": 0.2
    },
    "min_evaluations": 2
  }
}
```

</div>

## Notes

- When using `"weighted_mean"`, any criterion present in the evaluation records but absent from `weight_map` is assigned a weight of `0` and does not contribute to the total score. Log a warning appears in the run trace if this occurs.
- The node writes the finalised leaderboard to the `battle_results` table and updates the battle status to `"scored"`. Downstream nodes such as `series_advance` read from this persisted record rather than the node's in-memory output.
- With `"median"` aggregation, ties in the final score are broken by the submission timestamp (earlier submission wins), preserving a stable ranking.
- If `min_evaluations` is greater than `1`, this node is most useful in hybrid judging pipelines where multiple AI models or multiple human reviewers each produce a separate evaluation run.
