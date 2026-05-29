---
title: Embedding
description: Generates a dense vector embedding for a text value using a configured embedding model.
---

# Embedding

## Overview

The Embedding node calls an embedding model API and converts a text string into a fixed-dimensional float vector. The resulting vector is attached to the workflow data object under `output_field` so that downstream nodes — most commonly `vector_search` or a custom `code` node — can consume it without making a second API call. Use this node when the same embedding needs to feed multiple branches, or when you want explicit control over which model produces the representation.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `model_key` | string | Yes | — | Identifier of the embedding model to use (e.g. `"text-embedding-3-small"`, `"text-embedding-3-large"`, `"text-embedding-ada-002"`). Must be registered in the platform's model registry. |
| `input_path` | string | No | `"$.text"` | JSONPath expression pointing to the text field within the incoming data object. Defaults to the top-level `text` property. |
| `output_field` | string | No | `"embedding"` | Name of the field added to the output object that holds the embedding vector (array of floats). |
| `encoding_format` | string | No | `"float"` | Encoding format for the returned vector. One of `"float"` (array of 32-bit floats) or `"base64"` (base64-encoded binary, smaller payload). |
| `dimensions` | integer | No | — | Desired output dimensionality. Only supported by models that allow variable dimensions (e.g. `text-embedding-3-*`). Omit to use the model's default. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Data object containing the text to embed. The field referenced by `input_path` is extracted and sent to the embedding API. |
| `text` | string | Shorthand input: a bare string to embed. When connected, `input_path` is ignored. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The original input object with `output_field` added (or overwritten). The embedding value is an array of floats (or a base64 string when `encoding_format` is `"base64"`). |
| `embedding` | array of numbers | The raw embedding vector, emitted separately for easy wiring into `vector_search`'s `query_embedding` port. |
| `usage` | object | Token usage information: `{ prompt_tokens: number, total_tokens: number }`. |

## Example

```json
{
  "nodeType": "embedding",
  "config": {
    "model_key": "text-embedding-3-small",
    "input_path": "$.query",
    "output_field": "query_embedding",
    "encoding_format": "float",
    "dimensions": 512
  }
}
```

## Notes

- Embedding calls count against your connected AI provider's token quota; monitor usage via the `usage` output port or the platform's cost dashboard.
- When feeding the result directly into `vector_search`, wire the `embedding` output port to `vector_search`'s `query_embedding` port to avoid a second embedding call.
- The dimensionality of the stored vectors in a collection must match the dimensionality produced by this node; mismatched dimensions cause the search query to fail.
- For batch processing, prefer the `loop_map` node to embed multiple texts in parallel rather than serialising calls through a single Embedding node.
