---
title: Summarizer
description: Condenses long text or documents into a concise summary using a configured language model.
---

# Summarizer

## Overview

The Summarizer node sends an input text to a language model with instructions to produce a condensed version. The output format can be a coherent paragraph, a bullet-point list, or a single TL;DR sentence, depending on the configured `format`. An optional `preserve_entities` flag instructs the model to keep named entities (people, organisations, products, dates) intact, which is important when the summary feeds a downstream extraction or fact-checking step.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `model_key` | string | Yes | — | Language model to use for summarisation (e.g. `"gpt-4o-mini"`, `"claude-3-haiku"`). Must be registered in the platform's model registry. |
| `max_tokens` | integer | No | `256` | Target length of the summary in tokens. The model treats this as a soft upper bound; very long inputs may produce slightly longer summaries. Range: 32–2048. |
| `format` | string | No | `"paragraph"` | Summary style. One of `"paragraph"` (flowing prose), `"bullets"` (markdown bullet list), or `"tldr"` (single sentence prefixed with "TL;DR:"). |
| `preserve_entities` | boolean | No | `false` | When `true`, the model is instructed not to paraphrase or drop named entities (people, organisations, dates, product names). |
| `language` | string | No | `"en"` | BCP-47 language code for the output summary. The model will produce the summary in this language regardless of the input language. |
| `system_prompt` | string | No | — | Custom system prompt to prepend to the summarisation instruction. Use to add domain context or tone guidance. If omitted, a default summarisation prompt is used. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `text` | string | The long-form text to be summarised. For structured inputs, extract the relevant field upstream with `extract_field` or `json_transform` before connecting to this port. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `summary` | string | The condensed summary in the configured `format`. |
| `usage` | object | Token usage for the LLM call: `{ prompt_tokens: number, completion_tokens: number, total_tokens: number }`. |

## Example

```json
{
  "nodeType": "summarizer",
  "config": {
    "model_key": "gpt-4o-mini",
    "max_tokens": 150,
    "format": "bullets",
    "preserve_entities": true,
    "language": "en"
  }
}
```

```json
{
  "nodeType": "summarizer",
  "config": {
    "model_key": "claude-3-haiku",
    "max_tokens": 60,
    "format": "tldr",
    "preserve_entities": false,
    "system_prompt": "You are a legal document assistant. Summarise with precision."
  }
}
```

## Notes

- Very short inputs (under ~100 tokens) may produce a summary nearly as long as the original; consider gating this node with an `if_condition` that checks input length first.
- The `max_tokens` limit applies to the completion only; the input text contributes to the total context window of the chosen model — stay within the model's context limit.
- When `format` is `"bullets"`, the output is a raw markdown string starting with `- `; render it in a markdown-aware UI component or pass it through `output_parser` if you need a structured array.
- For very long documents (articles, transcripts, PDFs), split the input first with the `text_splitter` node and summarise each chunk, then summarise the summaries in a second pass.
