---
title: Video
description: Represents a video artifact in the workflow.
---

# Video

## Overview

The Video node represents a video artifact within a workflow — a typed container that carries a resolved video reference (`{ url, mimeType }`) between nodes. Use it to hold or pass through video data that originated from an upstream `text_to_video` generation, an `object_storage_download`, or any other node that produces a `video` output type. The node does not generate or transform video; it simply surfaces the artifact with its URL and MIME type so downstream nodes such as `video_analyze`, `media_convert`, or `object_storage_upload` can consume it via a typed connection. Connecting a non-video source to a Video node's input produces a type-compatibility warning in Workflow Studio.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | No | Static video URL to inject when no upstream node supplies one. Accepts https:// or signed storage URLs. Ignored if an upstream video port is connected. |
| `mimeType` | enum | No | MIME type of the video artifact (e.g. video/mp4, video/webm). Defaults to video/mp4. Used when the upstream source does not include MIME metadata. |
| `label` | string | No | Human-readable label shown in Workflow Studio for this artifact node. Does not affect execution. |
| `storageKey` | string | No | Optional media.objects key that references a persisted video in object storage. When set, the node resolves a signed URL at execution time instead of using the raw url field. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `video` | video | Upstream video artifact ({ url: string, mimeType: string }) from a generator node such as text_to_video or a storage download. Optional when a static url is configured. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `video` | video | Resolved video artifact object ({ url: string, mimeType: string }) ready for downstream consumption. |
| `error` | error | Emitted when the video URL cannot be resolved or the upstream artifact is missing. Route to an error_catch node to handle gracefully. |

## Example

```json
{
  "nodeType": "video",
  "config": {
    "url": "https://storage.lenserfight.io/media/replay-battle-123.mp4",
    "mimeType": "video/mp4",
    "label": "Battle Replay Clip"
  }
}
```
