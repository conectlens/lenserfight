---
title: Text Splitter
description: Splits a long text into chunks suitable for embedding or processing.
---

# Text Splitter

## Overview

The Text Splitter node splits a long input string into an array of smaller text chunks based on configurable size and overlap parameters. Use it upstream of embedding nodes or AI processing steps that have token or character limits. Chunks are emitted as an array on the output port; if the input is empty or splitting produces no chunks, an empty array is emitted rather than an error.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `strategy` | enum (character, token, sentence, recursive) | Yes | Splitting strategy. 'character' splits by raw character count, 'token' splits by estimated token count, 'sentence' splits on sentence boundaries, 'recursive' tries paragraph then sentence then character splits in order. |
| `chunkSize` | number | Yes | Maximum size of each chunk in the unit defined by the chosen strategy (characters or tokens). Must be greater than 0. |
| `chunkOverlap` | number | No | Number of characters or tokens to overlap between consecutive chunks. Helps preserve context across chunk boundaries. Defaults to 0. Must be less than chunkSize. |
| `separator` | string | No | Custom separator string used to split text when strategy is 'character'. Defaults to a newline character. Ignored for other strategies. |
| `trimWhitespace` | boolean | No | When true, leading and trailing whitespace is trimmed from each chunk before output. Defaults to true. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `text` | string | The input text to split. Required. If an empty string is received, the node emits an empty array on the output port. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `chunks` | string[] | Ordered array of text chunks produced by the split. Each element is a non-empty string of at most chunkSize units (plus overlap from the preceding chunk). |
| `count` | number | Total number of chunks produced. Useful for downstream branching or logging without needing to inspect the full array. |

## Example

```json
{
  "nodeType": "text_splitter",
  "config": {
    "strategy": "recursive",
    "chunkSize": 512,
    "chunkOverlap": 64,
    "trimWhitespace": true
  }
}
```
