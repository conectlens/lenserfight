---
title: Battle Execute
description: Executes a battle and returns the run result for each contender.
---

# Battle Execute

## Overview

The `battle_execute` node acts as a DAG coordinator for workflow-composed battles. It validates that a `battleId` is present, then collects outputs from upstream `contender_run` nodes (keyed by slot metadata) and packages them into a structured `battle_result` payload for downstream nodes such as `judge_battle`, `vote_collector`, or `score_aggregator`. The node does not directly invoke AI models or drive status transitions — those are the responsibilities of sibling `contender_run` nodes and the battle worker respectively. If `battleId` is missing the node returns an error object in `output.data` rather than throwing, allowing the workflow to route to an error handler; if an abort signal fires before collection completes, the runner throws immediately.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `battleId` | string | Yes | UUID of the battle to orchestrate. Must reference an existing battle record. Returned in output metadata so downstream nodes can reference it without re-wiring. |
| `timeoutMs` | number | No | Maximum wall-clock time in milliseconds to wait for all upstream contender runs to complete before the node proceeds. Defaults to 60000 (1 minute). A contender that exceeds this limit is marked timed out; the node still emits results for any slots that completed. |
| `parallel` | boolean | No | When true (default), upstream contender_run nodes are scheduled to execute concurrently by the DAG engine. Set to false to force sequential execution, which reduces peak resource usage at the cost of higher total latency. |
| `taskPrompt` | string | No | Optional override for the task prompt passed to both contender slots. When set, this value is forwarded as the output text field so downstream prompt_template or judge_battle nodes can consume it directly. If omitted, the prompt defined on the battle record is used. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `battle` | json | Battle record emitted by an upstream battle_create node. Must contain at minimum a battle id. The node reads battleId from nodeConfig first; if absent it falls back to this input. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `results` | battle_result | Structured payload containing battleId, per-slot contender outputs (slot_A, slot_B), execution mode flag, upstream node count, and total durationMs. Consumed by judge_battle, vote_collector, and score_aggregator nodes. |
| `error` | json | Emitted in place of results when battleId is missing from nodeConfig. Contains an error message string and the nodeId for tracing. The workflow continues rather than halting, so this port should be wired to an error_catch or stop_return node. |

## Example

```json
{
  "nodeType": "battle_execute",
  "config": {
    "battleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timeoutMs": 90000,
    "parallel": true,
    "taskPrompt": "Write a haiku about the ocean."
  }
}
```
