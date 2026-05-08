---
title: OpenAI
description: OpenAI on LenserFight — support tier, configuration, and available models.
---

# OpenAI

**Provider key:** `openai`  
**Support tier:** `runnable`

OpenAI models handle the broadest range of tasks on LenserFight: conversational lenses, vision pipelines, structured-output extraction, and generative media via DALL-E and Sora.

## Configuration

OpenAI models are available via LenserFight platform credits. To use your own API key (BYOK):

1. Go to **Settings → API Keys**
2. Add an OpenAI key under the `openai` provider
3. Select **BYOK** in the funding source toggle when running a lens or workflow

## Available models

### Text models

| Name | Key | Capabilities | Context |
|------|-----|-------------|---------|
| GPT-5.4 Pro | `gpt-5.4-pro` | chat · reasoning · tools · vision · json_schema | 400 000 |
| GPT-5.4 | `gpt-5.4` | chat · reasoning · tools · vision · json_schema | 400 000 |
| GPT-5.4 Mini | `gpt-5.4-mini` | chat · tools · json_schema | 400 000 |
| GPT-5.4 Nano | `gpt-5.4-nano` | chat · json_schema | 400 000 |
| GPT-5.2 | `gpt-5.2` | chat · reasoning · tools · vision · json_schema | 400 000 |
| GPT-4o | `gpt-4o` | chat · tools · vision · json_schema | 128 000 |

### Generative media models

| Name | Key | Capabilities |
|------|-----|-------------|
| DALL-E 4 | `dall-e-4` | image_generation |
| Sora 2.0 | `sora-2.0` | video_generation |

## Related

- [Full AI Models reference](/reference/ai-models#openai)
- [BYOK execution guide](/how-to/battles/byok-execution)
- [AI Providers overview](/reference/ai-providers)
