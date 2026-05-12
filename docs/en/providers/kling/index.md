---
title: Kling
description: Kling on LenserFight — video generation, support tier, and configuration.
---

# Kling

**Provider key:** `kling`  
**Support tier:** `runnable`

Kling AI produces high-quality video clips from text prompts, with particularly strong character-consistent motion. Use it for cinematic video generation lenses.

## Configuration

Kling models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a Kling API key under the `kling` provider
3. Select **BYOK** in the funding source toggle

## Available models

| Name | Key | Capabilities | Notes |
|------|-----|-------------|-------|
| Kling 2.0 | `kling-2.0` | video_generation | Character-consistent motion |

Kling uses an async task-poll execution pattern — generation jobs are submitted and polled until the video is ready.

## Related

- [Full AI Models reference](/en/reference/ai-models#kling)
- [BYOK execution guide](/en/how-to/battles/byok-execution)
- [AI Providers overview](/en/reference/ai-providers)
