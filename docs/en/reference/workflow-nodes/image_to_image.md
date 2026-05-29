---
title: Image To Image
description: Transforms an image using a style or inpainting prompt.
---

# Image To Image

## Overview

The Image To Image node transforms an input image by applying a style transfer, inpainting, or prompt-guided diffusion pass, producing a modified image as output. Use it to restyle contender outputs, fill masked regions, or apply visual transformations within a battle workflow. The node requires a valid image input (URL or base64) and a text prompt describing the desired transformation; an API credential for the underlying image model must be configured. On failure, execution routes to the `error` output port with a structured error payload.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | enum | Yes | The image generation model to use for the transformation (e.g. stable-diffusion-xl, dall-e-3, flux-dev). |
| `prompt` | string | Yes | Text prompt describing the desired output image or transformation style. |
| `negative_prompt` | string | No | Text describing features to suppress or avoid in the output image. |
| `strength` | number | No | How strongly the prompt overrides the input image. Range 0.0–1.0; lower values preserve more of the original (default: 0.75). |
| `mask_image_key` | string | No | Workflow data key for a binary mask image used in inpainting mode. When provided, only the masked region is transformed. |
| `steps` | number | No | Number of diffusion steps. Higher values improve quality at the cost of latency (default: 30). |
| `credential_id` | string | Yes | ID of the stored API credential for the selected image model provider. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `image` | string | Source image to transform, as a URL or base64-encoded data URI. |
| `mask` | string | Optional binary mask image (URL or base64) defining the inpainting region. Overrides mask_image_key in config when present. |
| `prompt_override` | string | Optional runtime prompt that overrides the static prompt set in config. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | string | The transformed image as a base64-encoded data URI or URL, depending on provider response format. |
| `metadata` | object | Provider response metadata including model used, seed, steps, and finish reason. |
| `error` | object | Structured error payload emitted when the transformation fails (e.g. invalid image, credential error, timeout). Contains code and message fields. |

## Example

```json
{
  "nodeType": "image_to_image",
  "config": {
    "model": "stable-diffusion-xl",
    "prompt": "oil painting style, warm golden tones, impressionist brushwork",
    "strength": 0.6,
    "steps": 30,
    "credential_id": "cred_sdxl_prod_01"
  }
}
```
