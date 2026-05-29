---
title: Image Upscale
description: Upscales an image to a higher resolution using a super-resolution model.
---

# Image Upscale

## Overview

The Image Upscale node takes an input image and enlarges it to a higher resolution using a super-resolution model, producing a higher-fidelity output image. Use it in workflows where battle contenders submit low-resolution images that need to be standardized before display, comparison, or scoring. The node passes the upscaled image URL or binary to the output port on success; if the upscale operation fails (unsupported format, model timeout, oversized input), execution routes to the error port so the workflow can handle degraded output gracefully. No external credentials are required when using the built-in model, but a provider API key must be configured to route through a third-party super-resolution service.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `scale_factor` | enum | Yes | Upscale multiplier applied to both dimensions. Accepted values: 2, 4, 8. Higher values increase processing time and output file size. |
| `model` | enum | Yes | Super-resolution model to use. Options: built_in (default, no credentials needed), real_esrgan, esrgan_plus, swinir. Third-party models require provider_api_key. |
| `provider_api_key` | string | No | API key for the external super-resolution provider. Required when model is not built_in. Stored as a secret reference; do not paste raw keys into config. |
| `output_format` | enum | No | Image format for the upscaled output. Options: png (default), jpeg, webp. PNG preserves lossless quality; jpeg and webp reduce file size at the cost of some fidelity. |
| `max_input_megapixels` | number | No | Maximum allowed input resolution in megapixels before the node rejects the image and routes to the error port. Defaults to 4. Prevents runaway memory usage on oversized inputs. |
| `timeout_seconds` | number | No | Maximum time in seconds to wait for the upscale operation before failing. Defaults to 60. Increase for large inputs or slower external providers. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `image` | ImageRef | The source image to upscale. Accepts a URL string, a base64-encoded data URI, or an ImageRef object produced by upstream nodes (e.g. Image Generate, File Upload). Supported formats: PNG, JPEG, WEBP, BMP. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | ImageRef | The upscaled image as an ImageRef object containing url, width, height, format, and size_bytes fields. Emitted on successful completion. |
| `error` | ErrorRef | Emitted when the upscale fails — e.g. unsupported input format, input exceeds max_input_megapixels, provider timeout, or invalid API key. Contains code, message, and upstream_node_id fields. |

## Example

```json
{
  "nodeType": "image_upscale",
  "config": {
    "scale_factor": 4,
    "model": "real_esrgan",
    "provider_api_key": "{{secrets.ESRGAN_API_KEY}}",
    "output_format": "png"
  }
}
```
