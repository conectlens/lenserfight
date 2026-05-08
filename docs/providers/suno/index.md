---
title: Suno
description: Suno on LenserFight — AI music generation, support tier, and configuration.
---

# Suno

**Provider key:** `suno`  
**Support tier:** `runnable`

Suno produces full songs — vocals plus instrumentation — from a text prompt. It is the primary music generation provider on LenserFight.

## Configuration

Suno models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a Suno API key under the `suno` provider
3. Select **BYOK** in the funding source toggle

## Available models

| Name | Key | Capabilities | Notes |
|------|-----|-------------|-------|
| Suno v5 | `suno-v5` | audio_generation · music_generation | Full songs with vocals + instrumentation |

Suno uses an async task-poll execution pattern — the lens engine submits the generation job and polls until the audio track is ready.

## Use cases

- Music generation lenses for creative workflows
- Jingle or soundtrack creation from descriptive text prompts
- Combining with lyric-writing lenses in a Connected Lens workflow

## Related

- [Full AI Models reference](/reference/ai-models#suno)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
