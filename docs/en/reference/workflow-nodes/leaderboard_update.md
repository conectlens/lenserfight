---
title: Leaderboard Update
description: Updates leaderboard scores after a battle or evaluation run.
---

# Leaderboard Update

## Overview

The `leaderboard_update` node updates one or more leaderboard entries after a battle or evaluation run completes, writing score deltas, rank changes, and metadata to the configured leaderboard store. It accepts a scored result payload from upstream nodes (such as a judge or aggregator) and emits the updated entry on success or routes to an error port on write failure. Use this node at the end of a scoring pipeline to persist results before triggering downstream notifications or series progression. The node is idempotent when given the same `execution_id`, making it safe to retry on transient failures.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `leaderboard_id` | string | Yes | UUID of the target leaderboard to update. Must reference an existing leaderboard record. |
| `score_field` | string | Yes | Dot-path into the input payload that holds the numeric score (e.g. `result.score` or `judge.final_score`). |
| `contender_field` | string | Yes | Dot-path into the input payload that identifies the contender (lenser handle or UUID) being scored. |
| `update_strategy` | enum | Yes | How to apply the incoming score: `replace` overwrites the current score, `increment` adds to it, `best_of` keeps the higher value. |
| `include_metadata_fields` | string | No | Comma-separated dot-paths from the input payload to copy into the leaderboard entry's metadata column (e.g. `judge.reasoning,battle.id`). |
| `emit_rank_change` | boolean | No | When true, the output payload includes `rank_before` and `rank_after` fields. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Scored result payload from an upstream judge, aggregator, or battle-completion node. Must contain the fields referenced by `score_field` and `contender_field`. |
| `battle_context` | object | Optional supplemental context (battle ID, series ID, round number) merged into the leaderboard entry's metadata when `include_metadata_fields` is configured. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The updated leaderboard entry, including `contender_id`, `score`, `rank`, and any requested metadata fields. |
| `error` | object | Emitted when the write fails (e.g. leaderboard not found, constraint violation, or network timeout). Contains `code` and `message` fields. |

## Example

```json
{
  "nodeType": "leaderboard_update",
  "config": {
    "leaderboard_id": "b3f2a1d0-84c7-4e5a-9f10-cc2e7a3d55b2",
    "score_field": "judge.final_score",
    "contender_field": "battle.winner_id",
    "update_strategy": "best_of",
    "emit_rank_change": true
  }
}
```
