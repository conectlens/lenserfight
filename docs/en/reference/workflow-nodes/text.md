---
title: Text
description: Represents a text artifact or static string value in the workflow.
---

# Text

## Overview

The Text node holds a static string value that is injected into the workflow at execution time. Use it to supply fixed prompts, labels, instructions, or template fragments without connecting a dynamic data source. The node emits its configured content as a plain string on the output port, making it suitable as a prompt seed, system message, or constant input to downstream AI or transform nodes. No credentials or external calls are required.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string (multiline) | Yes | The static text value this node emits. Supports plain text and template variables using &#123;&#123;variableName&#125;&#125; syntax resolved at runtime. |
| `label` | string | No | Display name shown on the node canvas. Does not affect execution. |
| `trim` | boolean | No | When true, leading and trailing whitespace is stripped from the content before emission. Defaults to false. |
| `encoding` | enum (utf-8, base64) | No | Output encoding for the string value. Use base64 when downstream nodes expect encoded binary-safe text. Defaults to utf-8. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `variables` | string-keyed map | Optional key-value map used to resolve &#123;&#123;variableName&#125;&#125; placeholders in the content field at execution time. If omitted, placeholders are left as-is. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | string | The resolved text content after variable substitution and any configured transforms (e.g. trimming, encoding). |

## Example

<div v-pre>

```json
{
  "nodeType": "text",
  "config": {
    "content": "You are a concise AI assistant. Answer in {{language}} using at most three sentences.",
    "label": "System Prompt Seed",
    "trim": true,
    "encoding": "utf-8"
  }
}
```

</div>

