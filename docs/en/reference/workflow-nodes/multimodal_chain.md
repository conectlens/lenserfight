---
title: Multimodal Chain
description: Chains text, image, audio, and video inputs into a single multimodal prompt.
---

# Multimodal Chain

## Overview

The `multimodal_chain` node assembles text, image, audio, and video inputs from upstream nodes into a single, ordered multimodal prompt that a vision- or audio-capable model can reason over in one pass. Use it when a workflow accumulates assets across multiple modalities — for example, a generated image, a transcription, and a text description — and a downstream Lens or model needs them combined into one coherent context. The node does not call a provider itself; it constructs and emits an `ExecutionInput` envelope (including the `attachments` array) that the next AI node consumes. If a required modality port receives no data, the node omits that slot rather than failing, so downstream provider compatibility determines whether partial inputs are acceptable.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `model_id` | string | Yes | Model key used by the downstream provider to process the assembled multimodal prompt (e.g. `google:gemini-2.0-flash`, `openai:gpt-4o`). Must reference a model that supports all modalities present in the chain. |
| `prompt_template` | string | Yes | Handlebars-style template rendered as the text part of the outgoing prompt. May reference upstream outputs via `{{label}}` placeholders. Combined with attached media before dispatch. |
| `modalities` | enum | No | Ordered list of modalities to include in the assembled context. Accepted values: `text`, `image`, `audio`, `video`. Defaults to including all connected input ports. Omitting a modality suppresses it even when the upstream port has data. |
| `max_attachments` | number | No | Maximum number of media attachments forwarded to the provider. Defaults to `4`. Capped at `8` by the execution engine regardless of this value. |
| `onParentFailure` | enum | No | Behavior when an upstream node fails. Accepted values: `propagate` (default), `skip`, `substitute_default`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `text` | text | Text content included as the primary text part of the assembled prompt. |
| `image` | image | Image artifact (URL + MIME type) attached as a vision content part. |
| `audio` | audio | Audio artifact (URL + MIME type) attached as an audio content part. |
| `video` | video | Video artifact (URL + MIME type) attached as a video content part. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `result` | text | Text response emitted by the provider after processing the assembled multimodal prompt. |
| `error` | error | Error envelope emitted when the provider rejects the request or a required modality is unsupported. Connect to an `error_catch` node to handle gracefully. |

## Example

```json
{
  "nodeType": "multimodal_chain",
  "config": {
    "model_id": "google:gemini-2.0-flash",
    "prompt_template": "Describe the scene in the image, then verify the caption matches the audio transcript: {{caption}}",
    "modalities": [
      "text",
      "image",
      "audio"
    ],
    "max_attachments": 2
  }
}
```
