---
title: Classifier
description: Classifies input text into one or more predefined categories using a language model.
---

# Classifier

## Overview

The Classifier node sends input text and a list of category labels to a language model, which returns the most appropriate label (or labels, in multi-label mode). A confidence score is produced for each predicted category; results below `confidence_threshold` are excluded from the output. This node replaces ad-hoc prompt engineering for classification tasks and produces a consistent, structured output that downstream nodes can branch on without additional parsing.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `categories` | array\<string\> | Yes | — | Ordered list of category labels the model may assign. Each label should be a short, unambiguous string (e.g. `["positive", "negative", "neutral"]`). |
| `model_key` | string | Yes | — | Language model to use for classification (e.g. `"gpt-4o-mini"`, `"claude-3-haiku"`). Must be registered in the platform's model registry. |
| `multi_label` | boolean | No | `false` | When `false` (default), the model returns exactly one category (single-label classification). When `true`, the model may return multiple categories that all apply. |
| `confidence_threshold` | number | No | `0.5` | Minimum confidence score (0–1) a category must achieve to appear in the output. Categories below this value are silently dropped. Only meaningful when the model returns probability estimates. |
| `system_prompt` | string | No | — | Custom system prompt providing domain context or classification guidelines. If omitted, a default zero-shot classification prompt is used. |
| `input_path` | string | No | `"$.text"` | JSONPath expression pointing to the text field in the incoming data object. Defaults to the top-level `text` property. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Data object containing the text to classify. The field at `input_path` is extracted and sent to the model. |
| `text` | string | Shorthand input: a bare string to classify. When connected, `input_path` is ignored. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `label` | string | The top predicted category label. In single-label mode this is always set. In multi-label mode it is the highest-confidence label above the threshold. |
| `labels` | array\<object\> | All predicted categories above `confidence_threshold`, each with `{ label: string, confidence: number }`, sorted descending by confidence. |
| `confidence` | number | Confidence score of the top label (0–1). |
| `usage` | object | Token usage for the LLM call: `{ prompt_tokens: number, completion_tokens: number, total_tokens: number }`. |

## Example

```json
{
  "nodeType": "classifier",
  "config": {
    "model_key": "gpt-4o-mini",
    "categories": ["bug_report", "feature_request", "question", "praise", "other"],
    "multi_label": false,
    "confidence_threshold": 0.6,
    "input_path": "$.body"
  }
}
```

```json
{
  "nodeType": "classifier",
  "config": {
    "model_key": "claude-3-haiku",
    "categories": ["violence", "hate_speech", "spam", "adult_content", "safe"],
    "multi_label": true,
    "confidence_threshold": 0.75,
    "system_prompt": "You are a content moderation assistant. Apply all labels that clearly apply."
  }
}
```

## Notes

- In single-label mode, connect the `label` output directly to a `switch` node to branch the workflow per category without an intermediate `output_parser` step.
- Confidence scores are model-dependent; some models return calibrated probabilities while others produce heuristic estimates. Validate thresholds empirically for your use case.
- For a fixed, small label set (2–5 categories), lower-cost models like `gpt-4o-mini` or `claude-3-haiku` typically achieve accuracy comparable to larger models at a fraction of the cost.
- When using `multi_label: true`, the `labels` array may be empty if no category clears `confidence_threshold`; add a downstream `if_condition` to handle this case explicitly.
