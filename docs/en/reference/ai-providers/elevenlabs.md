---
title: ElevenLabs
description: ElevenLabs models available on LenserFight — high-quality text-to-speech and voice cloning.
---

# ElevenLabs

ElevenLabs is a first-class execution provider on LenserFight for audio generation. The platform integrates ElevenLabs v4 for high-quality text-to-speech output with voice cloning support. Audio results are delivered via the task-poll pattern and stored as signed media assets.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[elevenlabs.io/docs](https://elevenlabs.io/docs/api-reference/text-to-speech)

## Models on LenserFight

### ElevenLabs v4

| Field | Value |
|-------|-------|
| Key | `elevenlabs-v4` |
| Capabilities | audio_generation |
| Input modalities | text |
| Output modalities | audio |
| [Provider docs](https://elevenlabs.io/docs/api-reference/text-to-speech) | — |

High-quality text-to-speech with voice cloning. Returns an audio file via the task-poll pattern.

## Usage notes

- Declare `output_contract.kind = audio` in your lens version so the execution engine applies the correct `GenerativeMediaAdapter` and polls for completion.
- Voice selection and cloning parameters are passed through the lens's `input_snapshot`; see the ElevenLabs API reference for available voice IDs.
