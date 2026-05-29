---
title: Text To Video
description: Generates a video clip from a text description.
---

# Text To Video

## Overview

The Text To Video node generates a short video clip from a text prompt by calling a configured video generation provider (e.g. RunwayML, Kling, Pika). It requires a valid provider API credential stored in the workflow's secrets and emits either a video asset URL on success or routes to an error port on failure. Use this node in battle workflows where contenders must produce video output from a given prompt, or in automation pipelines that render visual content for media battles.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Video generation provider to use. Supported values: runwayml, kling, pika, stable-video. |
| `credential_key` | string | Yes | Name of the workflow secret that holds the provider API key (e.g. RUNWAY_API_KEY). |
| `duration_seconds` | number | No | Target clip length in seconds. Provider minimums and maximums apply. Defaults to provider default (typically 4–5 s). |
| `resolution` | enum | No | Output resolution. Supported values: 480p, 720p, 1080p. Defaults to 720p. |
| `motion_strength` | number | No | Motion intensity from 0.0 (minimal movement) to 1.0 (maximum movement). Not supported by all providers. |
| `seed` | number | No | Random seed for reproducible generation. Omit or set to -1 for a random seed. |
| `timeout_ms` | number | No | Maximum milliseconds to wait for the provider to return a result before the node routes to the error port. Defaults to 120000. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `prompt` | string | Text description used to generate the video. Typically injected from an upstream node such as a battle contender output or a template string node. |
| `negative_prompt` | string | Optional. Text describing content to suppress in the generated video. Passed directly to the provider if supported. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Shape: { url: string, duration_seconds: number, provider: string, seed: number }. The url is a publicly accessible video asset. |
| `error` | object | Emitted when the provider call fails, times out, or returns an unusable result. Shape: { code: string, message: string, provider: string }. |

## Example

```json
{
  "nodeType": "text_to_video",
  "config": {
    "provider": "runwayml",
    "credential_key": "RUNWAY_API_KEY",
    "duration_seconds": 4,
    "resolution": "720p"
  }
}
```
