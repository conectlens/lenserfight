---
title: Audio
description: Handles audio data within a workflow.
---

# Audio

## Overview

The Audio node executes a lens-backed AI call that produces an audio artifact — such as a generated voiceover, music clip, or sound effect — using an audio-capable provider (ElevenLabs, Suno, OpenAI TTS). Setting `nodeType: 'audio'` on the node config causes the execution engine to route the call through the provider pipeline, enforce the modality guard (blocking execution if the governing agent policy forbids audio output), and emit a `NodeOutputEnvelope` with `artifactKind: 'audio'` and a `media.url` pointing to the stored asset. Use this node when a workflow step must produce audio from a lens prompt, rather than using purpose-built utility nodes such as `text_to_speech` or `image_to_audio`, which target specific fixed transformations.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `modelId` | string | Yes | AI model key for the audio-capable provider, e.g. `elevenlabs:eleven_multilingual_v2` or `openai:gpt-4o-mini-tts`. Must be registered in the model registry and resolve to a provider with an audio adapter. |
| `nodeType` | enum | Yes | Must be set to `audio`. Signals the execution engine to apply the audio modality guard and write `artifactKind: 'audio'` on the output envelope. |
| `funding_source` | enum | No | Funding mode for execution. One of `platform_credit`, `user_byok_cloud`, or `user_byok_local`. Defaults to `platform_credit`. Audio generation via fal-ai adapters requires `platform_credit` or `user_byok_local`. |
| `param_overrides` | object | No | Static key-value overrides applied to the lens template params after edge resolution — for example `{ voice_id: '21m00Tcm4TlvDq8ikWAM', speed: '1.0' }`. |
| `retry` | object | No | Retry policy override for this node. Shape: `{ attempts: number, backoffMs: number, retryOn: string[] }`. Defaults to 2 attempts with 1 s back-off, retrying on `timeout`, `provider_error`, and `rate_limit`. |
| `timeoutMs` | number | No | Per-call timeout in milliseconds before the node is cancelled and retried (if configured). Audio generation is typically slower than text; set at least 60000 ms for music-generation models. |
| `moderation` | enum | No | Moderation policy applied to the rendered input prompt before the provider call. One of `none`, `basic`, or `strict`. Defaults to the run-level moderation setting. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | text | Rendered prompt text wired from an upstream node or root inputs. Passed verbatim to the audio provider after lens template resolution and moderation checks. |
| `attachments` | any | Optional multimodal context inferred from upstream edge outputs (e.g. an image URL resolved by `inferAttachmentsFromRendered`). Passed as `ExecutionInput.attachments` to the provider when present. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | audio | Primary output envelope with `artifactKind: 'audio'`. The `media.url` field holds the URL of the stored audio asset; `media.mime` carries the MIME type (e.g. `audio/mpeg`). The `output` string field contains the URL as a plain string for downstream `[[label]]` template interpolation. |
| `error` | error | Emitted when all retry attempts are exhausted or a non-retriable provider error occurs. Contains `message`, `nodeId`, and the last error cause (`timeout`, `rate_limit`, or `provider_error`). Route to an `error_catch` node to handle gracefully. |

## Example

```json
{
  "nodeType": "audio",
  "config": {
    "nodeType": "audio",
    "modelId": "elevenlabs:eleven_multilingual_v2",
    "funding_source": "platform_credit",
    "param_overrides": {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "speed": "1.0",
      "format": "mp3"
    },
    "timeoutMs": 60000,
    "retry": {
      "attempts": 2,
      "backoffMs": 3000,
      "retryOn": [
        "timeout",
        "rate_limit"
      ]
    }
  }
}
```
