---
title: Midjourney
description: Midjourney on LenserFight — premium artistic image generation, support tier, and configuration.
---

# Midjourney

**Provider key:** `midjourney`  
**Support tier:** `deprecated`

::: warning Deprecated Provider
Midjourney is currently **deprecated** in LenserFight. No public API is available from Midjourney, and no adapter implementation exists. This provider entry is retained for reference only. Consider using **Fal.ai** (Flux models) or **Stability AI** for image generation instead.
:::

Midjourney produces highly artistic, stylised images from text prompts. It was planned as a BYOK provider pending Midjourney's public API availability.

## Configuration

1. Obtain Midjourney API access (currently limited — check [midjourney.com](https://www.midjourney.com) for availability)
2. Go to **Settings → API Keys** in LenserFight
3. Add your Midjourney key under the `midjourney` provider
4. Select **BYOK → Midjourney** when running an image generation lens

## Available models

| Name | Key | Capabilities | Notes |
|------|-----|-------------|-------|
| Midjourney 7 | `midjourney-7` | image_generation | Premium artistic style |

## Related

- [Full AI Models reference](/en/reference/ai-models#midjourney)
- [BYOK execution guide](/en/how-to/battles/byok-execution)
- [AI Providers overview](/en/reference/ai-providers)
