---
title: Contender Run
description: Runs a single battle contender and captures its output.
---

# Contender Run

## Overview

The Contender Run node executes a single AI lens as one side of a battle, feeding it the rendered battle prompt and capturing the provider's output as text. It requires an AI provider to be wired by the workflow engine; if the provider is absent (e.g. in dry-run or test mode) it falls back to echoing the resolved prompt. The node attaches battle context metadata — `battleId`, `contenderId`, `slot`, and execution timing — to its output for downstream nodes such as `judge_battle` or `score_aggregator`. Provider errors propagate unconditionally so the engine's retry or `error_catch` layer can handle them.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `lensId` | string (UUID) | Yes | The lens that generates this contender's response. Must be a published lens UUID. |
| `slot` | enum: 'A' | 'B' | Yes | Which side of the battle this contender occupies. Determines how scores, votes, and metadata are attributed downstream. |
| `battleId` | string (UUID) | No | The parent battle ID. Attached to output metadata so downstream nodes (judge_battle, leaderboard_update) can correlate results without re-wiring. |
| `contenderId` | string (UUID) | No | The contender record ID. Attached to output metadata for audit trails and replay events. |
| `maxTokens` | number | No | Output token cap for this contender. Falls back to the lens default when omitted. Shorter limits reduce cost but may truncate complex answers. |
| `temperature` | number (0–2) | No | Sampling temperature override. Overrides the lens default when set. For fair comparisons, use the same value on both contender nodes. |
| `personalityNote` | string | No | Appended as a system-prompt prefix to the provider call. Use to give a contender a persona without modifying the underlying lens. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `prompt` | text | The rendered battle prompt the contender must respond to. Typically wired from a prompt_template or battle_execute node. [[label]] placeholders must be resolved by the engine before this node runs. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | text | The contender's generated response text. In fallback mode (no provider), contains the raw resolved prompt. |
| `metadata` | json | Execution context attached by the runner: battleId, contenderId, slot, durationMs, token counts, provider finish_reason, and executedBy marker. Consumed by judge_battle and score_aggregator. |

## Example

<div v-pre>

```json
{
  "nodeType": "contender_run",
  "config": {
    "lensId": "d4e5f6a7-b8c9-0123-def0-123456789abc",
    "slot": "A",
    "battleId": "{{n1.battle.id}}",
    "maxTokens": 2048,
    "temperature": 0.7
  }
}
```

</div>

