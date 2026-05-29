---
title: Text To Speech
description: Converts text to a spoken audio file.
---

# Text To Speech

## Overview

The Text To Speech node converts a text string into a spoken audio file using a configured voice and speech provider. It is used in workflows where battle results, narration, or AI-generated responses need to be delivered as audio output. The node requires a provider credential and emits a URL or binary audio payload on success; if synthesis fails, execution routes through the error port. Audio format and voice characteristics are configurable per invocation.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Speech synthesis provider to use. Supported values: openai, elevenlabs, google. |
| `voice` | string | Yes | Voice identifier as defined by the selected provider (e.g. 'alloy', 'nova', 'en-US-Neural2-F'). |
| `model` | string | No | Provider model or engine variant to use for synthesis (e.g. 'tts-1-hd'). Defaults to the provider's standard model. |
| `outputFormat` | enum | No | Audio output format. Supported values: mp3, wav, ogg. Defaults to mp3. |
| `speed` | number | No | Speaking rate multiplier. Accepts values from 0.25 to 4.0. Defaults to 1.0. |
| `credentialId` | string | Yes | ID of the stored credential used to authenticate with the selected provider. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `text` | string | The text content to synthesize into speech. Accepts plain text or SSML markup if supported by the selected provider. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful synthesis. Contains audioUrl (string) pointing to the generated audio file and mimeType (string) describing the format. |
| `error` | object | Emitted when synthesis fails. Contains message (string) and code (string) describing the failure reason. |

## Example

```json
{
  "nodeType": "text_to_speech",
  "config": {
    "provider": "openai",
    "voice": "nova",
    "model": "tts-1-hd",
    "outputFormat": "mp3",
    "speed": 1,
    "credentialId": "cred_openai_prod"
  }
}
```
