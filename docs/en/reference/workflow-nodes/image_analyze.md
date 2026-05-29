---
title: Image Analyze
description: Analyzes an image and returns structured descriptions or classifications.
---

# Image Analyze

## Overview

The Image Analyze node accepts an image input and runs it through a configured vision model, returning structured descriptions, classifications, or extracted metadata. Use it in battle workflows to evaluate visual outputs from contenders or to extract scene data for downstream decision nodes. Credentials for the chosen provider must be configured via the workspace's BYOK settings before the node executes. If analysis fails (e.g. unsupported format, model error), the node routes to its `error` output with a typed error payload.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Vision provider to use. Accepted values: openai, anthropic, google, azure_openai. |
| `model` | string | Yes | Model identifier for the chosen provider (e.g. gpt-4o, claude-3-5-sonnet-20241022, gemini-1.5-pro-vision). |
| `prompt` | string | Yes | Instruction sent to the model describing what to analyze or extract from the image (e.g. 'Describe the composition and dominant colors.'). |
| `output_format` | enum | No | Shape of the returned result. Accepted values: text (default), json. Use json to receive a structured object suitable for downstream nodes. |
| `max_tokens` | number | No | Upper limit on tokens in the model response. Defaults to 1024. |
| `detail_level` | enum | No | Image resolution hint passed to the provider where supported. Accepted values: auto (default), low, high. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `image` | string | Buffer | The image to analyze. Accepts a URL (http/https or signed storage URL), a base64-encoded data URI, or a binary Buffer. |
| `prompt_override` | string | Optional. When present, replaces the static prompt from config at runtime. Useful for dynamic analysis instructions from upstream nodes. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Analysis result from the model. Contains at minimum a `text` field (string). When output_format is json, the model's parsed JSON object is merged into this payload under a `data` key. |
| `error` | object | Emitted when analysis fails. Contains `code` (string), `message` (string), and optionally `provider_error` (raw upstream error object). |

## Example

```json
{
  "nodeType": "image_analyze",
  "config": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "prompt": "Identify all visible UI elements and describe the layout structure. Return a JSON object with keys: elements (array), layout (string), dominant_colors (array).",
    "output_format": "json",
    "detail_level": "high"
  }
}
```
