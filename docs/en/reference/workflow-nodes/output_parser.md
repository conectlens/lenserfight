---
title: Output Parser
description: Parses an LLM's raw text output into a validated, structured data object.
---

# Output Parser

## Overview

The Output Parser node takes raw text produced by a language model and coerces it into a structured, typed object defined by a JSON Schema. It supports JSON, YAML, and Markdown table source formats. When `strict` mode is enabled the node halts the workflow on a parse failure instead of forwarding a partial result, making it the right choice whenever downstream nodes depend on a guaranteed shape.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `schema` | object | Yes | — | JSON Schema (draft-07) describing the target output shape. All properties are validated after parsing. |
| `format` | string | No | `"json"` | Expected format of the model's raw text. One of `"json"`, `"yaml"`, or `"markdown_table"`. |
| `strict` | boolean | No | `false` | When `true`, a parse or validation failure routes to the `error` port and stops the node from emitting on `output`. When `false`, a best-effort partial object is emitted with a `_parseWarnings` field. |
| `trim_code_fences` | boolean | No | `true` | Strip leading/trailing markdown code fences (`` ``` ``) before parsing. Most LLMs wrap JSON blocks in fences; this option handles that automatically. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `text` | string | Raw text output from an LLM or any prior node. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Parsed and schema-validated object. Shape matches `config.schema`. |
| `error` | object | Emitted only when `strict: true` and parsing fails. Contains `message` (string) and `raw` (the original text). |

## Example

```json
{
  "nodeType": "output_parser",
  "config": {
    "format": "json",
    "strict": true,
    "trim_code_fences": true,
    "schema": {
      "type": "object",
      "required": ["title", "score", "tags"],
      "properties": {
        "title":  { "type": "string" },
        "score":  { "type": "number", "minimum": 0, "maximum": 10 },
        "tags":   { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

## Notes

- When `format` is `"markdown_table"`, each table row becomes an object using the header row as keys; only the first table in the text is parsed.
- The `schema` field is validated at workflow-save time — an invalid schema prevents publishing the workflow.
- In non-strict mode, `_parseWarnings` is an array of strings describing each validation violation; downstream nodes should check for its presence before trusting the shape.
- Pairing this node directly after a `prompt_template` or `chain` node is the most common pattern for extracting structured judgement results from an LLM.
