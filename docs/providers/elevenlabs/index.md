---
title: ElevenLabs
description: ElevenLabs on LenserFight — text-to-speech and voice cloning, support tier, and configuration.
---

# ElevenLabs

**Provider key:** `elevenlabs`  
**Support tier:** `runnable`

ElevenLabs specialises in high-quality text-to-speech synthesis with voice cloning capabilities. Use it for narration lenses, audio generation workflows, and any lens that needs to produce human-quality speech output.

## Configuration

ElevenLabs models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add an ElevenLabs key under the `elevenlabs` provider
3. Select **BYOK** in the funding source toggle

## Available models

| Name | Key | Capabilities | Notes |
|------|-----|-------------|-------|
| ElevenLabs v4 | `elevenlabs-v4` | audio_generation | High-quality TTS with voice cloning |

ElevenLabs uses an async task-poll execution pattern — the lens execution engine submits the synthesis job and polls until the audio file is ready.

## Use cases

- Narration lenses that read out thread content or summaries
- Multilingual audio output for accessibility
- Podcast-style audio generation from text workflows

## Related

- [Full AI Models reference](/reference/ai-models#elevenlabs)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
