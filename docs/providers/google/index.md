---
title: Google
description: Google on LenserFight — Gemini and generative media models, support tier, and configuration.
---

# Google

**Provider key:** `google`  
**Support tier:** `runnable`

Google's Gemini series offers the largest context windows available on LenserFight (up to 2 million tokens), along with strong vision, reasoning, and multimodal generation via Imagen, Veo, and Lyria.

## Configuration

Google models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add a Google AI (Gemini API) key under the `google` provider
3. Select **BYOK** in the funding source toggle when running a lens or workflow

## Available models

### Gemini text models

| Name | Key | Capabilities | Context |
|------|-----|-------------|---------|
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | chat · reasoning · tools · vision | 2 000 000 |
| Gemini 3 Pro Preview | `gemini-3-pro-preview` | chat · reasoning · tools · vision | 2 000 000 |
| Gemini 2.5 Pro | `gemini-2.5-pro` | chat · reasoning · tools · vision | 2 000 000 |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | chat · tools · vision | 1 000 000 |
| Gemini 2.5 Flash | `gemini-2.5-flash` | chat · tools · vision | 1 000 000 |
| Gemini 3.1 Flash Lite Preview | `gemini-3.1-flash-lite-preview` | chat · tools | 1 000 000 |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite` | chat · tools | 1 000 000 |

### Generative media models

| Name | Key | Capabilities |
|------|-----|-------------|
| Imagen 4 | `imagen-4` | image_generation |
| Veo 3 | `veo-3` | video_generation |
| Lyria 2 | `lyria-2` | audio_generation · music_generation |

## Related

- [Full AI Models reference](/reference/ai-models#google)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
