---
title: Audio Transcribe
description: Transcribes audio input to text.
---

# Audio Transcribe

## Overview

The Audio Transcribe node converts an audio input into a plain-text transcript using a speech-to-text provider. It accepts an audio file URL or binary stream on its input port and emits the resulting transcript string on its output port. If transcription fails — due to an unsupported format, provider error, or credential issue — execution is routed to the error port rather than halting the workflow. A valid provider credential must be configured before the node can run.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Speech-to-text provider to use. Supported values: openai_whisper, google_speech, assemblyai, deepgram. |
| `language` | string | No | BCP-47 language code to hint the transcription engine (e.g. en-US, tr-TR). Leave empty to enable auto-detection. |
| `outputFormat` | enum | No | Shape of the transcript on the output port. plain_text returns a single string; timestamped returns an array of {start, end, text} segment objects. Defaults to plain_text. |
| `credentialId` | string | Yes | ID of the stored provider credential to authenticate the transcription request. |
| `maxAudioDurationSeconds` | number | No | Hard cap on input audio length in seconds. Inputs exceeding this limit are routed to the error port instead of being transcribed. Defaults to 600. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `audio` | AudioInput | The audio to transcribe. Accepts a publicly accessible URL string, a base64-encoded data URI, or a binary buffer reference produced by an upstream node such as File Read or HTTP Request. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `transcript` | string or transcript segments | The transcribed text. A plain string when outputFormat is plain_text; an array of {start: number, end: number, text: string} objects when outputFormat is timestamped. |
| `error` | NodeError | Emitted when transcription fails. Contains code, message, and provider-specific detail. Downstream nodes can inspect this to implement retry or fallback logic. |

## Example

```json
{
  "nodeType": "audio_transcribe",
  "config": {
    "provider": "openai_whisper",
    "credentialId": "cred_whisper_prod",
    "language": "en-US",
    "outputFormat": "plain_text"
  }
}
```
