---
title: Image
description: Represents an image artifact in the workflow.
---

# Image

## Overview

The Image node is a static artifact node that injects a pre-existing image asset into a workflow. It holds a configured image URL or uploaded file reference and emits it as a typed `NodeOutputEnvelope` with `kind: image` and `artifactKind: image` — no AI provider call is made. Use this node as a fixed input source when a downstream node (such as `image_analyze`, `image_to_image`, `image_upscale`, or `multimodal_chain`) requires an image that is known at workflow design time rather than generated at runtime. If the configured URL is unreachable at execution time, downstream nodes receive an empty or null media descriptor and should be guarded with a `try_catch` or `condition` node.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Publicly accessible URL of the image to inject. Supports HTTPS URLs and storage-object references (e.g. supabase storage public URLs). The value is forwarded verbatim in the output envelope's media.url field. |
| `mimeType` | enum | No | MIME type of the image. Accepted values: image/png, image/jpeg, image/webp, image/gif, image/svg+xml. When omitted the engine infers the type from the URL extension or defaults to image/*. |
| `label` | string | No | Optional human-readable label for the node displayed in the workflow builder canvas. Has no effect on execution. |
| `altText` | string | No | Descriptive alt text stored in the output envelope metadata. Downstream vision nodes may use this as a caption or accessibility annotation. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Optional upstream data. Accepts any value but the Image node does not use it — it always emits the statically configured image. Wiring an input is useful when ordering the node within a sequential chain via a dependency edge. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | NodeOutputEnvelope { kind: 'image', artifactKind: 'image', output: string, media: { url, mime } } | The image artifact envelope. The output field contains the image URL as a string projection for template placeholder compatibility. The media object carries the full URL and MIME type for downstream media-aware nodes. |

## Example

```json
{
  "nodeType": "image",
  "config": {
    "url": "https://cdn.example.com/assets/reference-photo.webp",
    "mimeType": "image/webp",
    "label": "Reference Photo",
    "altText": "A high-resolution product photo on a white background"
  }
}
```
