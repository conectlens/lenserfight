---
title: Switch
description: Routes workflow execution to one of several named ports based on a value or expression match.
---

# Switch

## Overview

The `switch` node evaluates an expression against the incoming data and forwards that data to the matching output port, enabling conditional branching across multiple paths. It is the multi-branch equivalent of `if_condition`: where `if_condition` handles binary true/false splits, `switch` handles three or more discrete outcomes. If no case matches, data is routed to the `default_port`. Each matched port connects to its own downstream subgraph; unmatched ports are simply not activated.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `expression` | string | Yes | — | A JSONPath expression (e.g. `$.status`) or a dot-path shorthand (e.g. `status`) evaluated against the `input` object to produce the comparison value. |
| `cases` | array | Yes | — | Ordered list of case objects. Each case has `value` (the expected match value, any JSON scalar) and `port` (the output port name to activate). Cases are evaluated top-to-bottom; the first match wins. |
| `default_port` | string | No | `"default"` | Output port name to activate when no case matches. If omitted and no case matches, execution stops at this node without error. |
| `strict_types` | boolean | No | `false` | When `true`, comparison is type-strict (`===`). When `false`, string `"200"` matches number `200`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The data object against which `expression` is evaluated and which is forwarded to the matched output port unchanged. |

## Outputs

| Port | Type | Description |
|---|---|---|
| *(case port names)* | any | One output port per entry in `cases`, named by the `port` field of each case. Only the matched port activates per execution. |
| `default` | any | Activated when no case matches (or the name set in `default_port`). Carries the same `input` data. |

## Example

```json
{
  "nodeType": "switch",
  "config": {
    "expression": "$.http_response.output.status",
    "cases": [
      { "value": 200, "port": "success" },
      { "value": 429, "port": "rate_limited" },
      { "value": 401, "port": "unauthorised" }
    ],
    "default_port": "unexpected",
    "strict_types": false
  }
}
```

In this example, if `http_response.output.status` is `200`, only the `success` output port fires. A status of `500` activates `unexpected`.

## Notes

- Cases are tested in order; put the most specific or most common case first for clarity and slight performance benefit.
- The `switch` node does not modify the input data — it acts purely as a router. All output ports receive the exact same object that entered `input`.
- Port names in `cases` must be valid identifier strings (alphanumeric and underscores); they become labelled edges in the workflow graph editor.
- If `default_port` is omitted and no case matches, the node is a silent no-op. This can be intentional (discard unrecognised values) but is easy to mistake for a bug — adding an explicit `default` port with a downstream `stop_return` or `error_catch` node is recommended.
