---
title: Stop & Return
description: Terminates the workflow and returns a value as the final output.
---

# Stop & Return

## Overview

The Stop & Return node terminates workflow execution immediately and emits a specified value as the workflow's final output. Use it at the end of any execution branch — including error paths and conditional branches — to explicitly define what the workflow returns to its caller. Only one Stop & Return node runs per execution; all downstream nodes are skipped once it fires. The return value can be a static literal, a dynamic expression referencing upstream node outputs, or an empty signal to indicate completion without a payload.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `returnValue` | string | object | number | boolean | No | The value to emit as the workflow's final output. Accepts a static literal or a template expression referencing upstream outputs (e.g. `&#123;&#123;nodes.summarize.output&#125;&#125;`). Defaults to null if omitted. |
| `returnAs` | enum(raw, json, text) | No | Serialization format for the return value. `raw` passes the value as-is, `json` serializes it to a JSON string, `text` coerces it to a plain string. Defaults to `raw`. |
| `label` | string | No | Human-readable label for this exit point, shown in the workflow graph. Useful when multiple Stop & Return nodes exist on different branches (e.g. "success", "fallback", "error exit"). |
| `statusCode` | number | No | Optional integer status code attached to the return envelope (e.g. 200, 400, 500). Consumed by callers that treat workflows as API-like handlers. Has no effect on execution flow. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The primary value to return. If `returnValue` is also configured, `returnValue` takes precedence; otherwise this port's value is emitted as the final output. |
| `statusCode` | number | Dynamic status code override. Supersedes the static `statusCode` config field when connected. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The final workflow output value. Emitted to the workflow's caller synchronously before execution halts. Downstream nodes inside the same workflow never receive this signal. |

## Example

<div v-pre>

```json
{
  "nodeType": "stop_return",
  "config": {
    "returnValue": "{{nodes.judge.output.verdict}}",
    "returnAs": "json",
    "label": "success",
    "statusCode": 200
  }
}
```

</div>

