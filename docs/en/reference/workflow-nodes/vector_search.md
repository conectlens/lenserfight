---
title: Vector Search
description: Performs a semantic similarity search over a vector store and returns the top-k matching documents.
---

# Vector Search

## Overview

The Vector Search node queries a named vector collection using either a plain-text query or a pre-computed embedding vector. The platform converts a text query to an embedding automatically using the collection's default embedding model before running the nearest-neighbor search. Results are ranked by cosine similarity and filtered by an optional score threshold and metadata predicate, making this node the standard building block for RAG (Retrieval-Augmented Generation) pipelines.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `collection` | string | Yes | — | Name of the vector store collection to query. Must exist in the platform's vector store registry. |
| `query_text` | string | No | — | Plain-text search query. Mutually exclusive with `query_embedding`. The platform converts this to an embedding before searching. |
| `query_embedding` | array of numbers | No | — | Pre-computed embedding vector. Use when you need to reuse an embedding produced by the `embedding` node. Mutually exclusive with `query_text`. |
| `top_k` | integer | No | `5` | Maximum number of results to return. Range: 1–100. |
| `score_threshold` | number | No | `0.0` | Minimum cosine similarity score (0–1) a result must achieve to be included. Results below this value are silently dropped. |
| `metadata_filter` | object | No | `{}` | Key/value pairs matched against document metadata before scoring. All specified keys must match (AND semantics). |
| `include_metadata` | boolean | No | `true` | Whether to include the stored metadata object on each result. Set to `false` to reduce payload size when only the text content is needed. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `query_text` | string | Optional override for the `query_text` config field. If provided at runtime, it takes precedence over the static config value. |
| `query_embedding` | array of numbers | Optional pre-computed embedding passed at runtime from an upstream `embedding` node. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `results` | array of objects | Ordered list of matching documents. Each item contains `id` (string), `score` (number), `content` (string), and optionally `metadata` (object). |
| `count` | number | Total number of results returned (after threshold filtering). |

## Example

```json
{
  "nodeType": "vector_search",
  "config": {
    "collection": "lenserfight_docs",
    "query_text": "how do I create a battle series?",
    "top_k": 8,
    "score_threshold": 0.72,
    "metadata_filter": {
      "locale": "en",
      "section": "battles"
    },
    "include_metadata": true
  }
}
```

## Notes

- Exactly one of `query_text` or `query_embedding` must be provided — either in config or via an input port at runtime.
- The collection must be populated before the workflow runs; this node is read-only and never writes to the vector store.
- For high-traffic workflows, set `score_threshold` above `0.6` to avoid returning low-quality matches that can degrade LLM responses downstream.
- Pair with an `embedding` node when the same embedding is reused in multiple branches; this avoids duplicate API calls and reduces cost.
