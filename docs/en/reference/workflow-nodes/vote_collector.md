---
title: Vote Collector
description: Collects human or automated votes on battle outputs and aggregates results.
---

# Vote Collector

## Overview

The Vote Collector node gathers human or automated votes on battle contender outputs and aggregates them into a final result. It supports configurable quorum thresholds, vote windows, and both anonymous and authenticated voter modes. Use it when a battle requires explicit audience voting or multi-judge consensus before a winner can be declared. The node emits aggregated results on success and routes to an error port on timeout or quorum failure.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `vote_mode` | enum (human, automated, hybrid) | Yes | Determines who casts votes. 'human' waits for audience input, 'automated' uses AI judge scores, 'hybrid' accepts both and merges them. |
| `quorum` | number | Yes | Minimum number of votes required before results are finalized. Votes received below this threshold before timeout cause the node to route to the error port. |
| `timeout_seconds` | number | Yes | How long (in seconds) the node waits for votes before closing the window. On expiry, finalizes if quorum is met, otherwise emits to the error port. |
| `allow_anonymous` | boolean | No | When true, unauthenticated voters may participate. Defaults to false, which restricts voting to authenticated users only. |
| `tiebreak_strategy` | enum (random, ai_judge, creator_decides, none) | No | Strategy applied when votes are exactly tied. Defaults to 'none', which routes the tie to the error port for manual resolution. |
| `weight_by_role` | boolean | No | When true, votes from users with elevated roles (e.g. judges, verified lenSers) carry a configurable multiplier. Defaults to false (all votes equal weight). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `battle_outputs` | BattleOutput[] | Array of contender outputs to present to voters. Each entry must contain a contender ID and the output payload. |
| `voter_list` | string array or null | Optional allowlist of user IDs permitted to vote. When null and allow_anonymous is false, all authenticated users may vote. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `results` | VoteResult | Aggregated vote counts, percentages, and declared winner contender ID. Emitted when quorum is met and the vote window closes. |
| `error` | VoteError | Emitted on quorum failure, timeout without quorum, or unresolved tie when tiebreak_strategy is 'none'. Includes reason code and partial vote data. |

## Example

```json
{
  "nodeType": "vote_collector",
  "config": {
    "vote_mode": "human",
    "quorum": 10,
    "timeout_seconds": 300,
    "tiebreak_strategy": "ai_judge"
  }
}
```
