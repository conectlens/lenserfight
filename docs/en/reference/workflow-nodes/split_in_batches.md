---
title: Split In Batches
description: Splits a list into smaller batches for parallel or rate-limited processing.
---

# Split In Batches

## Overview

The Split In Batches node divides an incoming array into fixed-size chunks and emits each chunk sequentially or in parallel downstream, enabling rate-limited or parallelized processing of large lists. Use it when a downstream node (such as an AI model call or external API) has throughput limits, or when fan-out parallelism over a list is needed. Each emitted batch retains the original item order within the chunk. The node tracks batch index and total count so downstream nodes can detect the final batch and merge results.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `batchSize` | number | Yes | Number of items per batch. Must be a positive integer. Downstream nodes receive exactly this many items per emission, except the final batch which may be smaller. |
| `mode` | enum | Yes | Processing mode. 'sequential' emits one batch at a time and waits for downstream completion before emitting the next. 'parallel' emits all batches simultaneously. |
| `inputPath` | string | No | Dot-notation path into the input object to locate the array to split (e.g. 'data.results'). Defaults to the root value if the input itself is an array. |
| `continueOnEmpty` | boolean | No | When true, the node emits a single empty batch and continues execution if the input array is empty. When false (default), execution halts without emitting. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | array or object | The data payload containing the array to split. If the root value is an array it is used directly; otherwise provide inputPath to locate the array within the object. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `batch` | object | Emitted once per chunk. Contains 'items' (the batch array), 'batchIndex' (zero-based), 'totalBatches' (total chunk count), and 'isLast' (boolean). |
| `done` | object | Emitted once after all batches have been processed. Contains 'totalItems' and 'totalBatches' for downstream aggregation or merge nodes. |
| `error` | object | Emitted if the resolved input is not an array or if batchSize is invalid. Contains 'message' and 'inputPath' for debugging. |

## Example

```json
{
  "nodeType": "split_in_batches",
  "config": {
    "batchSize": 10,
    "mode": "sequential",
    "inputPath": "data.lensOutputs",
    "continueOnEmpty": false
  }
}
```
