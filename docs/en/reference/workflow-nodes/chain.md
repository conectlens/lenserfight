---
title: Chain
description: Chains multiple lens calls in sequence, piping output to the next.
---

# Chain

## Overview

The Chain node accumulates upstream outputs into an ordered message history (system + assistant turns) and emits the assembled conversation context as structured text for a downstream Lens or Lens Execute node. Use it when you need a multi-turn AI pipeline — for example, to feed progressive refinement steps or maintain reasoning context across sequential lens calls. A system prompt can be prepended; history is trimmed to `maxTurns` (hard-capped at 50) to stay within model context windows. The node makes no provider calls itself — it is a pure context builder with no side effects.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `steps` | json | Yes | Ordered array of chain step definitions. Each step specifies a type (e.g. prompt_template, lens_execute, output_parser) and its own config. Steps are executed in sequence; each step receives the output of the previous step as its input. |
| `systemPrompt` | string | No | System message prepended to the assembled message history before it is passed to the downstream lens. Sets the persona or task framing for the entire chain. |
| `maxTurns` | number | No | Maximum number of non-system conversation turns to retain in the history window. Defaults to 20; hard-capped at 50. Older turns are dropped from the front when the limit is exceeded. |
| `includeUpstream` | boolean | No | When true (default), each upstream node output is appended to the message history as an assistant turn before the downstream lens call. Set to false to start the chain with only the system prompt and existing history. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Any upstream payload. Text outputs are included verbatim as assistant messages; structured data is JSON-serialized. Multiple upstream connections are each appended as separate assistant turns. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `result` | json | Assembled conversation context. Contains text (the full formatted prompt string), messages (the ChainMessage array with role and content fields), messageCount, and maxTurns. Downstream Lens or Lens Execute nodes consume this directly. |
| `error` | error | Emitted when the step definitions are malformed or a required upstream input is missing. |

## Example

```json
{
  "nodeType": "chain",
  "config": {
    "steps": [
      {
        "type": "prompt_template",
        "template": "Summarize the following battle result for a founder audience: {{input}}"
      },
      {
        "type": "lens_execute",
        "model_id": "openai:gpt-4.1-mini"
      },
      {
        "type": "output_parser",
        "schema": {
          "summary": "string"
        }
      }
    ],
    "systemPrompt": "You are a concise technical writer for an AI battle platform.",
    "maxTurns": 10,
    "includeUpstream": true
  }
}
```
