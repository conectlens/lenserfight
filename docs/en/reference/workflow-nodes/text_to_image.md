---
title: Text To Image
description: Generates an image from a text prompt using a diffusion model.
---

# Text To Image

## Overview

The Text To Image node generates an image from a text prompt by calling a diffusion model provider (e.g. Stable Diffusion, DALL·E, Flux). It requires a provider credential configured in the workflow's secrets and emits a signed URL or base64-encoded image on success, or routes to the `error` port on failure. Use this node in battle workflows where image generation is the contender's primary task, or as a preprocessing step that produces visual input for downstream judge or scoring nodes.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Diffusion model provider to call. Supported values: `openai` (DALL·E 3), `stability` (Stable Diffusion), `fal` (Flux). Determines which credential key is resolved at runtime. |
| `model` | string | No | Provider-specific model ID to use (e.g. `dall-e-3`, `stable-diffusion-xl-1024-v1-0`, `fal-ai/flux/dev`). Defaults to the provider's recommended model when omitted. |
| `size` | enum | No | Output image dimensions. Accepted values: `256x256`, `512x512`, `1024x1024`, `1024x1792`, `1792x1024`. Defaults to `1024x1024`. Not all sizes are supported by every provider. |
| `quality` | enum | No | Generation quality tier. Accepted values: `standard`, `hd`. Only applicable to DALL·E 3; ignored by other providers. Defaults to `standard`. |
| `num_inference_steps` | number | No | Number of denoising steps for diffusion-based providers (Stability, Fal). Higher values improve quality at the cost of latency and token spend. Typical range 20–50. Defaults to 30. |
| `output_format` | enum | No | Format of the image data emitted on the `output` port. Accepted values: `url` (signed expiring URL), `base64` (raw PNG data URI). Defaults to `url`. |
| `prompt_input_key` | string | No | Key in the incoming data object to use as the text prompt. Defaults to `prompt`. Override when the upstream node emits the prompt under a different key (e.g. `text`, `caption`). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Incoming data object. Must contain the text prompt under the key specified by `prompt_input_key` (default: `prompt`). Any additional keys are passed through and merged into the output object. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Original input object merged with an `image` field containing the generated image. When `output_format` is `url`, `image` is a string URL. When `output_format` is `base64`, `image` is a data URI (`data:image/png;base64,...`). |
| `error` | object | Emitted when the provider returns an error or the request times out. Contains the original input object plus an `error` field with `code` (string) and `message` (string). Wire this port to a fallback or retry node to handle generation failures gracefully. |

## Example

```json
{
  "nodeType": "text_to_image",
  "config": {
    "provider": "openai",
    "model": "dall-e-3",
    "size": "1024x1024",
    "quality": "hd",
    "output_format": "url"
  }
}
```
