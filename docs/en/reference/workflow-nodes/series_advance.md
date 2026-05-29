---
title: Series Advance
description: Advances a battle series to the next round or declares a series winner when an advance condition is met.
---

# Series Advance

## Overview

The Series Advance node evaluates whether the current round of a battle series is ready to progress. It reads the latest scored results for the series, applies the configured `advance_condition`, and — when the condition is satisfied — transitions the series to its next round. If the series has no further rounds, it instead marks the series as complete and publishes a final winner record. This node is designed to be the terminal node in a per-round automation workflow, chained after `score_aggregator`.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `series_id` | string | Yes | — | UUID of the battle series to advance. Supports template expressions. |
| `advance_condition` | `"all_complete"` \| `"threshold"` | No | `"all_complete"` | Rule that determines when the round is considered finished. `"all_complete"` waits until every battle in the current round is scored. `"threshold"` advances as soon as the percentage of completed battles reaches `winner_threshold`. |
| `winner_threshold` | number | No | — | Percentage (0–100) of battles that must be complete to trigger advancement when `advance_condition` is `"threshold"`. Required when `advance_condition` is `"threshold"`. |
| `auto_publish_results` | boolean | No | `false` | When `true`, the series result and leaderboard are immediately made public upon advancement or series completion. When `false`, results stay in `draft` state until a human publishes them. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Optional upstream data. Accepts `series_id` to override the static config. The node also reads the persisted battle results from the database rather than relying solely on upstream node output. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `series_id`, `action` (`"advanced"`, `"series_complete"`, or `"condition_not_met"`), `current_round` (integer, updated after advancement), `next_round` (integer or `null` if series is complete), `advanced_at` (ISO-8601 timestamp or `null`), and `series_winner` (contender ID or `null` if not yet determined). |

## Example

<div v-pre>

```json
{
  "nodeType": "series_advance",
  "config": {
    "series_id": "{{trigger.output.series_id}}",
    "advance_condition": "threshold",
    "winner_threshold": 80,
    "auto_publish_results": true
  }
}
```

</div>

## Notes

- When `action` is `"condition_not_met"`, the node exits successfully but does not mutate the series state. Use a downstream `condition` node to branch on this value and optionally retry or alert.
- `auto_publish_results: true` is convenient for fully automated series but bypasses the manual review step; enable it only when the upstream judging pipeline is trusted to produce correct results.
- Series winner determination follows the series' configured advancement rules (e.g. cumulative score, win count, or ELO delta); the `series_advance` node enforces those rules rather than re-implementing them.
- When a series reaches its final round and `action` is `"series_complete"`, the node fires a `series.completed` platform event, which triggers any notification workflows subscribed to that event type.
