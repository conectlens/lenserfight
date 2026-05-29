---
title: RAG Retrieval
description: Retrieves relevant documents from a vector store for retrieval-augmented generation.
---

# RAG Retrieval

## Overview

The RAG Retrieval node queries a configured vector store with an input query string and returns the top-k most semantically similar document chunks. Use it to inject relevant context into AI model prompts before a battle round executes. Retrieval requires a pre-indexed vector store and valid credentials; if the store is unreachable or the query produces no results above the similarity threshold, the node routes to its `error` output. Returned documents include content text and metadata (source, score) suitable for direct prompt assembly.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `vectorStoreId` | string | Yes | Identifier of the target vector store. Corresponds to a store registered in the project's integration settings. |
| `topK` | number | Yes | Maximum number of document chunks to retrieve. Higher values increase context richness but raise token cost. |
| `similarityThreshold` | number | No | Minimum cosine similarity score (0–1) a chunk must meet to be included. Chunks below this score are silently dropped. Defaults to 0.7. |
| `namespace` | string | No | Partition key within the vector store. Use to scope retrieval to a specific dataset or tenant when the store is shared. |
| `includeMetadata` | boolean | No | When true, each retrieved chunk includes its source metadata object alongside content text. Defaults to false. |
| `embeddingModel` | enum | No | Embedding model used to encode the query. Must match the model used at index time. Options: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `query` | string | The search query string to embed and retrieve against. Typically the current battle prompt or a distilled sub-question. |
| `filter` | object | Optional metadata filter object applied server-side before similarity ranking. Shape is store-specific (e.g. {"category": "science"}). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `documents` | array | Ordered array of retrieved chunks. Each item has {content: string, score: number, metadata?: object}. Empty array if no chunks exceed the threshold. |
| `error` | object | Emitted when the vector store is unreachable, credentials are invalid, or the query embedding fails. Contains {code: string, message: string}. |

## Example

```json
{
  "nodeType": "rag_retrieval",
  "config": {
    "vectorStoreId": "vs_lf_science_kb_01",
    "topK": 5,
    "similarityThreshold": 0.75,
    "includeMetadata": true
  }
}
```
