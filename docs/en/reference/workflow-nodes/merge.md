---
title: Merge
description: Merges multiple input branches into a single output.
---

# Merge

## Overview

The `merge` node collects outputs from multiple upstream branches and combines them into a single JSON envelope, making them available as one value to downstream nodes. Use it whenever a workflow splits into parallel branches (e.g. two parallel `lens` nodes or `battle_execute` + `vote_collector`) and the results must be reunited before a downstream step. The merge behavior is controlled by the `mode` field: `combine` deep-merges objects by key, `zip` pairs array items by index, `append` concatenates arrays, and `outer_join` matches records on a shared key field. No credentials are required; the node operates purely on in-memory execution state.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | enum | Yes | How the multiple upstream inputs are combined. `combine` merges objects by key (last writer wins on key collisions). `zip` pairs items positionally — output length equals the shorter input. `append` concatenates arrays in arrival order. `outer_join` matches records across inputs using the value of `mergeKey`. |
| `mergeKey` | string | No | The field name used to match records when `mode` is `outer_join` (e.g. `id` or `email`). Ignored for all other modes. Referencing a key that exists in only one input produces empty matches rather than an error. |
| `strategy` | enum | No | Edge-level override for how multiple values arriving on the same parameter label are resolved before the node-level `mode` is applied. Options: `last_write_wins` (default), `concat` (newline-joined), `array` (JS array), `json_object` (keyed by source node ID). When omitted, the run-level default `last_write_wins` applies. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input_a` | any | First upstream branch. Accepts any IO type — text, json, array, object, battle_result, lens_result, etc. |
| `input_b` | any | Second upstream branch. Additional input ports are created automatically for each incoming edge — there is no fixed upper limit. |
| `input_n` | any | Nth upstream branch. Every inbound edge wires into the merge evaluation; the node waits for all connected upstream nodes to complete before executing. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `merged` | array | The combined result set produced by the selected merge mode. Downstream nodes typically reference `$.merged` to access the unified payload. |
| `output` | json | Full output envelope containing the merged value alongside standard execution metadata. Use this port when the downstream node expects a plain JSON object rather than an array. |

## Example

```json
{
  "nodeType": "merge",
  "config": {
    "mode": "combine",
    "strategy": "json_object"
  }
}
```
