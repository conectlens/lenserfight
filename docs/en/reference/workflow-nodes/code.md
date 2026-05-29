---
title: Code
description: Executes a user-supplied JavaScript snippet inside a sandboxed runtime.
---

# Code

## Overview

The `code` node runs arbitrary JavaScript in a sandboxed V8 isolate, giving workflows the ability to transform data, compute values, or perform logic that no built-in node covers. The script receives the upstream `input` object as `input` and must return a value by assigning it to `output`. Network access, filesystem access, and native modules are not available inside the sandbox; for outbound calls use `http_request` instead. Only JavaScript is supported at this time.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `code` | string | Yes | — | The JavaScript source to execute. The variable `input` is pre-bound to the node's input object. Assign the result to `output` to pass data downstream. |
| `language` | string | No | `"javascript"` | Execution language. Currently only `"javascript"` is accepted. |
| `timeout_ms` | number | No | `5000` | Maximum milliseconds the script may run before it is forcibly terminated and the node fails. |
| `memory_limit_mb` | number | No | `64` | Maximum heap memory in megabytes the isolate may allocate. Exceeding this limit terminates the script. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Upstream data injected as the `input` variable inside the script. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The value assigned to the `output` variable inside the script. Can be any JSON-serialisable type. |
| `error` | object | Present when the script throws an unhandled exception or times out; contains `message`, `stack`, and `code` (`"TIMEOUT"` or `"RUNTIME_ERROR"`). |

## Example

```json
{
  "nodeType": "code",
  "config": {
    "language": "javascript",
    "timeout_ms": 3000,
    "memory_limit_mb": 32,
    "code": "const scores = input.contenders.map(c => c.score);\nconst winner = input.contenders.reduce((a, b) => a.score >= b.score ? a : b);\noutput = { winner: winner.id, max_score: Math.max(...scores), total: scores.length };"
  }
}
```

## Notes

- The script must assign `output` before it exits; if `output` is never assigned, the node emits `null` and continues. No `return` statement is required at the top level.
- `console.log()` calls are captured and available in the workflow run logs for debugging; they do not appear in `output`.
- The sandbox has no access to `fetch`, `require`, `process`, or any Node.js built-in. Pure computation and JSON manipulation are the intended use cases.
- Scripts that mutate the `input` variable do not affect upstream nodes — `input` is a deep copy of the upstream output, not a reference.
