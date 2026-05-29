---
title: Video Analyze
description: Analyzes a video and returns structured descriptions or frame-level annotations.
---

# Video Analyze

## Overview

The Video Analyze node submits a video to a vision-capable AI model and returns structured descriptions, frame-level annotations, or extracted metadata depending on the configured analysis mode. Use it when a battle or workflow step requires understanding visual content — such as scoring video submissions, extracting scene data, or generating captions. The node requires a valid AI provider credential with video or multimodal support; unsupported models route to the `error` output. Output shape varies by `mode`: `description` returns a single text summary, `frames` returns an array of per-frame annotation objects.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | AI provider to use for video analysis. Supported values: `openai`, `google`, `anthropic`. Must support multimodal or video input. |
| `model` | string | Yes | Model identifier for the selected provider (e.g. `gpt-4o`, `gemini-1.5-pro`). Must support video or image-frame input. |
| `mode` | enum | Yes | Analysis mode. `description` returns a single natural-language summary. `frames` returns per-frame annotations. `metadata` returns duration, resolution, and detected scene counts. |
| `frame_interval_seconds` | number | No | Interval in seconds between sampled frames when `mode` is `frames`. Defaults to `5`. Lower values increase cost and latency. |
| `prompt` | string | No | Custom instruction appended to the system prompt. Use to scope analysis (e.g. `Focus on code shown on screen`). Omit to use the default mode prompt. |
| `max_duration_seconds` | number | No | Maximum video length to process in seconds. Videos exceeding this value are truncated from the start. Defaults to `120`. |
| `credential_id` | string | No | ID of the stored provider credential to use. Falls back to the workspace default credential for the selected provider if omitted. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger input. Expects an object with a `video_url` (string, publicly accessible URL) or `video_base64` (string, base64-encoded video data). One of these fields is required at runtime. |
| `prompt_override` | string | Optional runtime override for the analysis prompt. Supersedes the `prompt` config field when present. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Successful analysis result. Shape depends on `mode`: `description` — `{ summary: string }`; `frames` — `{ frames: Array<{ timestamp_seconds: number, annotation: string }> }`; `metadata` — `{ duration_seconds: number, resolution: string, scene_count: number }`. |
| `error` | object | Emitted when analysis fails (unsupported model, provider error, video too long, or invalid input). Contains `{ code: string, message: string, retriable: boolean }`. |

## Example

```json
{
  "nodeType": "video_analyze",
  "config": {
    "provider": "google",
    "model": "gemini-1.5-pro",
    "mode": "frames",
    "frame_interval_seconds": 10,
    "prompt": "Describe any code or terminal output visible on screen.",
    "max_duration_seconds": 180
  }
}
```
