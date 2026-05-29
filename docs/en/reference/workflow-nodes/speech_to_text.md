---
title: Speech To Text
description: Converts speech audio to a text transcript.
---

# Speech To Text

## Overview

The Speech To Text node accepts an audio input and returns a plain-text transcript using a configured speech recognition provider. Use it to transcribe battle audio submissions, voice prompts, or recorded model responses before passing the text downstream to other nodes. The node requires a valid provider credential and emits an error port for unrecognisable audio or API failures. Language and model quality can be tuned via configuration to balance cost against accuracy.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | Yes | Speech recognition provider to use. Supported values: openai_whisper, google_speech, assemblyai, deepgram. |
| `credentialId` | string | Yes | ID of the stored credential used to authenticate with the selected provider. |
| `language` | string | No | BCP-47 language tag (e.g. en-US, tr-TR) hinting the expected spoken language. Defaults to auto-detect when omitted. |
| `model` | enum | No | Transcription model/quality tier. Values vary by provider (e.g. whisper-1, nova-2). Falls back to provider default when omitted. |
| `prompt` | string | No | Optional context string passed to the provider to improve accuracy for domain-specific vocabulary or proper nouns. |
| `timestampsEnabled` | boolean | No | When true, the transcript output includes word-level timestamps in addition to the plain text. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `audio` | AudioBuffer | FileRef | Raw audio data or a file reference (URL or storage key) pointing to the audio to transcribe. Accepted formats depend on the provider; WAV, MP3, and FLAC are broadly supported. |
| `prompt` | string | Optional runtime context prompt that overrides the static prompt set in config, useful for dynamic vocabulary hints. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `transcript` | string | The plain-text transcript of the audio input. |
| `transcriptData` | TranscriptResult | Structured transcription result containing the text, detected language, confidence score, and optional word-level timestamps when timestampsEnabled is true. |
| `error` | NodeError | Emitted when transcription fails — e.g. unsupported audio format, inaudible input, or provider API error. Contains a code and human-readable message. |

## Example

```json
{
  "nodeType": "speech_to_text",
  "config": {
    "provider": "openai_whisper",
    "credentialId": "cred_openai_prod",
    "language": "en-US",
    "timestampsEnabled": false
  }
}
```
